import { NextRequest, NextResponse } from 'next/server';
import { searchAllListings } from '@/lib/kw-uls-client';

// Markets to pre-fetch nightly
// Add more markets here as needed
const MARKETS = [
  { city: 'Austin', state: 'TX' },
  { city: 'Dallas', state: 'TX' },
  { city: 'Houston', state: 'TX' },
  { city: 'San Antonio', state: 'TX' },
];

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.KW_ULS_CLIENT_ID;
  const clientSecret = process.env.KW_ULS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'KW ULS credentials not configured' }, { status: 503 });
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const results: Array<{ market: string; active: number; sold: number; error?: string }> = [];

  for (const market of MARKETS) {
    try {
      const locationFilters = { city: market.city, stateProv: market.state };

      // Fetch active + closed in parallel for this market
      const [activeData, soldData] = await Promise.all([
        searchAllListings({
          query: {
            filters: { listingStatus: ['active'], listingCategory: ['sale'], ...locationFilters },
          },
          sort: { sortField: 'listingUpdateDate', sortOrder: 'desc' },
        }),
        searchAllListings({
          query: {
            filters: {
              listingStatusGranular: ['sold', 'closed'],
              listingCategory: ['sold'],
              closeDate: { min: ninetyDaysAgo },
              ...locationFilters,
            },
          },
          sort: { sortField: 'closeDate', sortOrder: 'desc' },
        }).catch(() => null),
      ]);

      results.push({
        market: `${market.city}, ${market.state}`,
        active: activeData.results?.length || 0,
        sold: soldData?.results?.length || 0,
      });
    } catch (err) {
      results.push({
        market: `${market.city}, ${market.state}`,
        active: 0,
        sold: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    refreshedAt: new Date().toISOString(),
    markets: results,
  });
}

// Vercel cron needs a longer timeout for paginating all markets
export const maxDuration = 300; // 5 minutes
