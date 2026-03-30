import { NextRequest, NextResponse } from 'next/server';
import { getRelevantSeriesIds, FRED_SERIES, formatFredValue } from '@/lib/fred';
import type { FredObservation } from '@/lib/fred';
import { searchListings, buildMarketSnapshot, formatSnapshotForAI, buildClosedSalesSnapshot, formatClosedSalesForAI } from '@/lib/kw-uls-client';
import { detectLocation } from '@/lib/detect-location';
import { fetchCompetitorContext } from '@/lib/sec-edgar';
import { fetchTavilyContext } from '@/lib/tavily';
import { fetchCensusContext } from '@/lib/census';
import { fetchGoogleTrendsContext } from '@/lib/google-trends';

// ─── FRED enrichment ─────────────────────────────────────────────────────────

// Baseline series always injected so the AI has market context for any query
const BASELINE_SERIES = ['MORTGAGE30US', 'CSUSHPINSA', 'MSPUS', 'ACTLISCOUUS', 'FEDFUNDS', 'UNRATE'];

async function fetchFredContext(query: string): Promise<string | null> {
  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) return null;

  // Always include baseline + any query-specific series
  const querySpecific = getRelevantSeriesIds(query);
  const allIds = [...new Set([...BASELINE_SERIES, ...querySpecific])];
  const relevantIds = allIds;
  if (relevantIds.length === 0) return null;

  try {
    const results = await Promise.all(
      relevantIds.map(async (seriesId) => {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredKey}&file_type=json&sort_order=desc&limit=6`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return { seriesId, observations: data.observations || [] };
      })
    );

    const lines: string[] = ['CURRENT ECONOMIC DATA (from Federal Reserve FRED, live data):'];

    for (const result of results) {
      if (!result) continue;
      const series = FRED_SERIES.find(s => s.id === result.seriesId);
      if (!series) continue;

      const valid: FredObservation[] = result.observations.filter((o: FredObservation) => o.value !== '.');
      if (valid.length === 0) continue;

      const latest = valid[0];
      const formatted = formatFredValue(latest.value, series);
      lines.push(`- ${series.label}: ${formatted} (as of ${latest.date})`);

      if (valid.length >= 2) {
        const prev = valid[1];
        lines.push(`  Previous: ${formatFredValue(prev.value, series)} (${prev.date})`);
      }
      if (valid.length >= 6) {
        const oldest = valid[valid.length - 1];
        lines.push(`  ~${valid.length} periods ago: ${formatFredValue(oldest.value, series)} (${oldest.date})`);
      }
    }

    return lines.length > 1 ? lines.join('\n') : null;
  } catch (err) {
    console.error('FRED enrichment error:', err);
    return null;
  }
}

// ─── KW Listings enrichment ──────────────────────────────────────────────────

async function fetchListingsContext(query: string): Promise<string | null> {
  const clientId = process.env.KW_ULS_CLIENT_ID;
  const clientSecret = process.env.KW_ULS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const location = detectLocation(query);
  if (!location) return null;

  const locationFilters = {
    ...(location.city ? { city: location.city } : {}),
    ...(location.state ? { stateProv: location.state } : {}),
  };

  // 90 days ago for closed sales
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // Fetch active + closed in parallel
    const [activeData, soldData] = await Promise.all([
      searchListings({
        query: {
          filters: { listingStatus: ['active'], listingCategory: ['sale'], propertyType: ['residential'], ...locationFilters },
        },
        sort: { sortField: 'listingUpdateDate', sortOrder: 'desc' },
        pagination: { max: 50, offset: 0 },
      }),
      searchListings({
        query: {
          filters: {
            listingStatusGranular: ['sold', 'closed'],
            listingCategory: ['sold'],
            propertyType: ['residential'],
            closeDate: { min: ninetyDaysAgo },
            ...locationFilters,
          },
        },
        sort: { sortField: 'closeDate', sortOrder: 'desc' },
        pagination: { max: 50, offset: 0 },
      }).catch(() => null), // Don't fail if closed sales query errors
    ]);

    const parts: string[] = [];

    // Active listings snapshot
    const activeTotal = typeof activeData.pagination?.total === 'object'
      ? (activeData.pagination.total as { value: number }).value
      : (activeData.pagination?.total as number) || activeData.results?.length || 0;

    if (activeData.results && activeData.results.length > 0) {
      const snapshot = buildMarketSnapshot(location.area, activeData.results, activeTotal);
      parts.push(formatSnapshotForAI(snapshot));
    }

    // Closed sales snapshot
    if (soldData && soldData.results && soldData.results.length > 0) {
      const soldTotal = typeof soldData.pagination?.total === 'object'
        ? (soldData.pagination.total as { value: number }).value
        : (soldData.pagination?.total as number) || soldData.results?.length || 0;

      const closedSnapshot = buildClosedSalesSnapshot(location.area, soldData.results, soldTotal, activeTotal);
      parts.push(formatClosedSalesForAI(closedSnapshot));
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
  } catch (err) {
    console.error('KW Listings enrichment error:', err);
    return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey || apiKey === 'your_key_here') {
    return NextResponse.json(
      { error: { message: 'PERPLEXITY_API_KEY is not configured. Add it to .env.local.' } },
      { status: 500 }
    );
  }

  let body: { system?: string; messages?: Array<{ role: string; content: string }>; max_tokens?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid request body' } }, { status: 400 });
  }

  // Extract user query for enrichment
  const userMessage = body.messages?.[0]?.content || '';
  const detectedLoc = detectLocation(userMessage);

  // Fetch all enrichment sources in parallel
  const [fredContext, listingsContext, competitorContext, tavilyContext, censusContext, trendsContext] = await Promise.all([
    fetchFredContext(userMessage),
    fetchListingsContext(userMessage),
    fetchCompetitorContext(userMessage),
    fetchTavilyContext(userMessage),
    fetchCensusContext(detectedLoc?.city, detectedLoc?.state),
    fetchGoogleTrendsContext(detectedLoc?.city, detectedLoc?.state, userMessage),
  ]);

  // Inject enrichment data into the user message
  const enrichedMessages = body.messages ? [...body.messages] : [];
  const allContexts = [fredContext, listingsContext, competitorContext, tavilyContext, censusContext, trendsContext];
  if (allContexts.some(c => c) && enrichedMessages.length > 0) {
    const contextParts: string[] = [];
    if (fredContext) contextParts.push(fredContext);
    if (listingsContext) contextParts.push(listingsContext);
    if (competitorContext) contextParts.push(competitorContext);
    if (censusContext) contextParts.push(censusContext);
    if (trendsContext) contextParts.push(trendsContext);
    if (tavilyContext) contextParts.push(tavilyContext);

    enrichedMessages[0] = {
      ...enrichedMessages[0],
      content: enrichedMessages[0].content + '\n\n' + contextParts.join('\n\n') +
        '\n\nUse the above real data points in your analysis. Cite specific numbers and dates.',
    };
  }

  const perplexityBody = {
    model: 'sonar-pro',
    messages: [
      { role: 'system', content: body.system || '' },
      ...enrichedMessages,
    ],
    max_tokens: body.max_tokens || 2000,
    temperature: 0.2,
  };

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(perplexityBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: { message: data.error?.message || `Perplexity API error ${response.status}` } },
        { status: response.status }
      );
    }

    const text: string = data.choices?.[0]?.message?.content || '';
    return NextResponse.json({ content: [{ type: 'text', text }] });
  } catch (err) {
    console.error('Perplexity API error:', err);
    return NextResponse.json(
      { error: { message: 'Failed to reach Perplexity API' } },
      { status: 502 }
    );
  }
}
