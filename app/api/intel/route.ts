import { NextRequest, NextResponse } from 'next/server';
import { getRelevantSeriesIds, FRED_SERIES, formatFredValue } from '@/lib/fred';
import type { FredObservation } from '@/lib/fred';
import { searchListings, buildMarketSnapshot, formatSnapshotForAI } from '@/lib/kw-uls-client';

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

// US states for location detection
const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

interface DetectedLocation {
  city?: string;
  state?: string;
  area: string; // human-readable label for the snapshot
}

function detectLocation(query: string): DetectedLocation | null {
  const upper = query.toUpperCase();

  // Pattern: "City, ST" or "City, State"
  const cityStateAbbr = query.match(/\b([A-Za-z][A-Za-z .'-]+),\s*([A-Z]{2})\b/);
  if (cityStateAbbr) {
    const stateCode = cityStateAbbr[2].toUpperCase();
    if (US_STATES[stateCode]) {
      return { city: cityStateAbbr[1].trim(), state: stateCode, area: `${cityStateAbbr[1].trim()}, ${stateCode}` };
    }
  }

  // Pattern: "in City" or "of City" followed by state
  const inCity = query.match(/(?:in|of|for|near)\s+([A-Za-z][A-Za-z .'-]+),?\s*([A-Z]{2})\b/i);
  if (inCity) {
    const stateCode = inCity[2].toUpperCase();
    if (US_STATES[stateCode]) {
      return { city: inCity[1].trim(), state: stateCode, area: `${inCity[1].trim()}, ${stateCode}` };
    }
  }

  // Pattern: just "in City" with a full state name
  for (const [code, name] of Object.entries(US_STATES)) {
    if (upper.includes(name.toUpperCase())) {
      // Try to find a city before the state mention
      const cityBeforeState = query.match(new RegExp(`(?:in|of|for|near)\\s+([A-Za-z][A-Za-z .'\\-]+?)\\s*,?\\s*${name}`, 'i'));
      if (cityBeforeState) {
        return { city: cityBeforeState[1].trim(), state: code, area: `${cityBeforeState[1].trim()}, ${code}` };
      }
      // Just the state
      return { state: code, area: name };
    }
  }

  // Pattern: just a state abbreviation like "TX market"
  const stateOnly = upper.match(/\b([A-Z]{2})\s+(?:market|real estate|housing|listings?|homes?)\b/);
  if (stateOnly && US_STATES[stateOnly[1]]) {
    return { state: stateOnly[1], area: US_STATES[stateOnly[1]] };
  }

  // Common metro areas without state
  const metros: Record<string, { city: string; state: string }> = {
    'austin': { city: 'Austin', state: 'TX' },
    'dallas': { city: 'Dallas', state: 'TX' },
    'houston': { city: 'Houston', state: 'TX' },
    'san antonio': { city: 'San Antonio', state: 'TX' },
    'phoenix': { city: 'Phoenix', state: 'AZ' },
    'los angeles': { city: 'Los Angeles', state: 'CA' },
    'san francisco': { city: 'San Francisco', state: 'CA' },
    'san diego': { city: 'San Diego', state: 'CA' },
    'denver': { city: 'Denver', state: 'CO' },
    'miami': { city: 'Miami', state: 'FL' },
    'tampa': { city: 'Tampa', state: 'FL' },
    'orlando': { city: 'Orlando', state: 'FL' },
    'jacksonville': { city: 'Jacksonville', state: 'FL' },
    'atlanta': { city: 'Atlanta', state: 'GA' },
    'chicago': { city: 'Chicago', state: 'IL' },
    'nashville': { city: 'Nashville', state: 'TN' },
    'charlotte': { city: 'Charlotte', state: 'NC' },
    'raleigh': { city: 'Raleigh', state: 'NC' },
    'seattle': { city: 'Seattle', state: 'WA' },
    'portland': { city: 'Portland', state: 'OR' },
    'las vegas': { city: 'Las Vegas', state: 'NV' },
    'new york': { city: 'New York', state: 'NY' },
    'boston': { city: 'Boston', state: 'MA' },
    'minneapolis': { city: 'Minneapolis', state: 'MN' },
    'columbus': { city: 'Columbus', state: 'OH' },
    'indianapolis': { city: 'Indianapolis', state: 'IN' },
    'kansas city': { city: 'Kansas City', state: 'MO' },
    'salt lake city': { city: 'Salt Lake City', state: 'UT' },
    'boise': { city: 'Boise', state: 'ID' },
  };

  const lower = query.toLowerCase();
  for (const [name, loc] of Object.entries(metros)) {
    if (lower.includes(name)) {
      return { city: loc.city, state: loc.state, area: `${loc.city}, ${loc.state}` };
    }
  }

  return null;
}

async function fetchListingsContext(query: string): Promise<string | null> {
  const clientId = process.env.KW_ULS_CLIENT_ID;
  const clientSecret = process.env.KW_ULS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const location = detectLocation(query);
  if (!location) return null;

  try {
    const data = await searchListings({
      query: {
        filters: {
          listingStatus: ['active'],
          listingCategory: ['sale'],
          ...(location.city ? { city: location.city } : {}),
          ...(location.state ? { stateProv: location.state } : {}),
        },
      },
      sort: { sortField: 'price', sortOrder: 'desc' },
      pagination: { max: 50, offset: 0 },
    });

    const totalCount = typeof data.pagination?.total === 'object'
      ? (data.pagination.total as { value: number }).value
      : (data.pagination?.total as number) || data.results?.length || 0;

    if (!data.results || data.results.length === 0) return null;

    const snapshot = buildMarketSnapshot(location.area, data.results, totalCount);
    return formatSnapshotForAI(snapshot);
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

  // Fetch FRED + KW Listings context in parallel
  const [fredContext, listingsContext] = await Promise.all([
    fetchFredContext(userMessage),
    fetchListingsContext(userMessage),
  ]);

  // Inject enrichment data into the user message
  const enrichedMessages = body.messages ? [...body.messages] : [];
  if ((fredContext || listingsContext) && enrichedMessages.length > 0) {
    const contextParts: string[] = [];
    if (fredContext) contextParts.push(fredContext);
    if (listingsContext) contextParts.push(listingsContext);

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
