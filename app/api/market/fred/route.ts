import { NextRequest, NextResponse } from 'next/server';

const FRED_BASE = 'https://api.stlouisfed.org/fred';

export async function GET(request: NextRequest) {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: { message: 'FRED_API_KEY is not configured.' } },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const seriesIds = searchParams.get('series');
  const limit = searchParams.get('limit') || '60';

  if (!seriesIds) {
    return NextResponse.json(
      { error: { message: 'Missing "series" query parameter. Pass comma-separated FRED series IDs.' } },
      { status: 400 }
    );
  }

  const ids = seriesIds.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const results = await Promise.all(
      ids.map(async (seriesId) => {
        const url = `${FRED_BASE}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.text();
          return { seriesId, error: `FRED API error ${res.status}: ${err}`, observations: [] };
        }
        const data = await res.json();
        return {
          seriesId,
          observations: (data.observations || []).map((o: { date: string; value: string }) => ({
            date: o.date,
            value: o.value,
          })),
        };
      })
    );

    return NextResponse.json({ data: results }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('FRED API error:', err);
    return NextResponse.json(
      { error: { message: 'Failed to fetch FRED data' } },
      { status: 502 }
    );
  }
}
