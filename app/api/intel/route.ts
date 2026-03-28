import { NextRequest, NextResponse } from 'next/server';
import { getRelevantSeriesIds, FRED_SERIES, formatFredValue } from '@/lib/fred';
import type { FredObservation } from '@/lib/fred';

// ─── FRED enrichment ─────────────────────────────────────────────────────────

async function fetchFredContext(query: string): Promise<string | null> {
  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) return null;

  const relevantIds = getRelevantSeriesIds(query);
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

  // Extract user query for FRED keyword matching
  const userMessage = body.messages?.[0]?.content || '';
  const fredContext = await fetchFredContext(userMessage);

  // If we have FRED data, inject it into the user message so the model uses real numbers
  const enrichedMessages = body.messages ? [...body.messages] : [];
  if (fredContext && enrichedMessages.length > 0) {
    enrichedMessages[0] = {
      ...enrichedMessages[0],
      content: enrichedMessages[0].content + '\n\n' + fredContext +
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
