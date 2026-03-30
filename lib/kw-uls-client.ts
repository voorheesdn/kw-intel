// ─── KW ULS API Client (server-side only) ────────────────────────────────────
// Shared auth + search logic used by both /api/listings and /api/intel routes.

import type { ULSSearchRequest, ULSSearchResponse, ULSListing } from './kw-listings';

// Token endpoint per DevHub docs: https://devhub.kw.com/documentation/authentication/client-credentials
const TOKEN_URL = 'https://partners.api.kw.com/idp/token';
const ULS_BASE = 'https://partners.api.kw.com/uls';

// ─── Token cache ─────────────────────────────────────────────────────────────

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  const clientId = process.env.KW_ULS_CLIENT_ID!;
  const clientSecret = process.env.KW_ULS_CLIENT_SECRET!;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  // client_secret_post: credentials in body (per DevHub docs)
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'read_all_listings',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token request failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return cachedToken.accessToken;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchListings(searchBody: ULSSearchRequest): Promise<ULSSearchResponse> {
  const token = await getAccessToken();

  const res = await fetch(`${ULS_BASE}/listings/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(searchBody),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ULS API error (${res.status}): ${err}`);
  }

  return res.json();
}

// ─── Paginated search (fetch ALL results) ───────────────────────────────────

export async function searchAllListings(
  searchBody: ULSSearchRequest,
  maxPages = 50, // safety cap: 50 pages × 100 = 5,000 listings max
): Promise<ULSSearchResponse> {
  // First page to get total count
  const firstPage = await searchListings({
    ...searchBody,
    pagination: { max: 100, offset: 0 },
  });

  const total = typeof firstPage.pagination?.total === 'object'
    ? (firstPage.pagination.total as { value: number }).value
    : (firstPage.pagination?.total as number) || firstPage.results?.length || 0;

  const allResults = [...(firstPage.results || [])];

  // If everything fit in one page, we're done
  if (allResults.length >= total || total <= 100) {
    return { pagination: { ...firstPage.pagination, total }, results: allResults };
  }

  // Calculate remaining pages needed
  const totalToFetch = Math.min(total, maxPages * 100);
  const offsets: number[] = [];
  for (let offset = 100; offset < totalToFetch; offset += 100) {
    offsets.push(offset);
  }

  // Fetch remaining pages in parallel batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < offsets.length; i += BATCH_SIZE) {
    const batch = offsets.slice(i, i + BATCH_SIZE);
    const pages = await Promise.all(
      batch.map(offset =>
        searchListings({
          ...searchBody,
          pagination: { max: 100, offset },
        }).catch(() => null)
      )
    );
    for (const page of pages) {
      if (page?.results) {
        allResults.push(...page.results);
      }
    }
  }

  return {
    pagination: { max: 100, total, offset: 0 },
    results: allResults,
  };
}

// ─── Market snapshot from listings ───────────────────────────────────────────

export interface LocalMarketSnapshot {
  area: string;
  totalActive: number;
  medianPrice: number;
  avgPricePerSqft: number;
  avgDaysOnMarket: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  propertyMix: Record<string, number>;
  sampleListings: Array<{
    address: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    status: string;
  }>;
}

export function buildMarketSnapshot(
  area: string,
  listings: ULSListing[],
  totalCount: number,
): LocalMarketSnapshot {
  const prices = listings
    .map(l => l.financials?.currentListPrice)
    .filter((p): p is number => typeof p === 'number' && p > 0)
    .sort((a, b) => a - b);

  const sqftPrices = listings
    .filter(l => l.financials?.currentListPrice > 0 && l.property?.livingArea?.value > 0)
    .map(l => l.financials.currentListPrice / l.property.livingArea.value);

  const daysOnMarket = listings
    .filter(l => l.listDate)
    .map(l => {
      const listed = new Date(l.listDate).getTime();
      const now = Date.now();
      return Math.floor((now - listed) / (1000 * 60 * 60 * 24));
    })
    .filter(d => d >= 0 && d < 3650);

  const propertyMix: Record<string, number> = {};
  for (const l of listings) {
    const type = l.propertySubtype || l.propertyType || 'other';
    propertyMix[type] = (propertyMix[type] || 0) + 1;
  }

  const median = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.length % 2 === 0
      ? (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2
      : arr[Math.floor(arr.length / 2)];

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    area,
    totalActive: totalCount,
    medianPrice: median(prices),
    avgPricePerSqft: Math.round(avg(sqftPrices)),
    avgDaysOnMarket: Math.round(avg(daysOnMarket)),
    priceRangeLow: prices[0] || 0,
    priceRangeHigh: prices[prices.length - 1] || 0,
    propertyMix,
    sampleListings: listings.slice(0, 5).map(l => ({
      address: l.address?.displayAddress || '',
      price: l.financials?.currentListPrice || 0,
      beds: l.property?.totalBed || 0,
      baths: l.property?.totalBath || 0,
      sqft: l.property?.livingArea?.value || 0,
      status: l.listStatus || '',
    })),
  };
}

export function formatSnapshotForAI(snapshot: LocalMarketSnapshot): string {
  const lines = [
    `KW LISTINGS DATA for ${snapshot.area} (live from KW Unified Listing Service):`,
    `- Total Active Listings: ${snapshot.totalActive.toLocaleString()}`,
    `- Median List Price: $${snapshot.medianPrice.toLocaleString()}`,
    `- Avg Price/SqFt: $${snapshot.avgPricePerSqft}`,
    `- Avg Days on Market: ${snapshot.avgDaysOnMarket}`,
    `- Price Range: $${snapshot.priceRangeLow.toLocaleString()} — $${snapshot.priceRangeHigh.toLocaleString()}`,
  ];

  const mixEntries = Object.entries(snapshot.propertyMix).sort((a, b) => b[1] - a[1]);
  if (mixEntries.length > 0) {
    lines.push(`- Property Mix: ${mixEntries.map(([t, c]) => `${t} (${c})`).join(', ')}`);
  }

  if (snapshot.sampleListings.length > 0) {
    lines.push(`- Sample Listings:`);
    for (const l of snapshot.sampleListings) {
      lines.push(`  • ${l.address} — $${l.price.toLocaleString()}, ${l.beds}bd/${l.baths}ba, ${l.sqft.toLocaleString()} sqft`);
    }
  }

  return lines.join('\n');
}

// ─── Closed Sales Snapshot ──────────────────────────────────────────────────

export interface ClosedSalesSnapshot {
  area: string;
  totalSold: number;
  medianSoldPrice: number;
  avgSoldPricePerSqft: number;
  avgSoldToListRatio: number;
  avgDaysToClose: number;
  absorptionRate: number | null; // sold per month / active — needs active count
  monthlyTrends: Array<{
    month: string;
    count: number;
    medianPrice: number;
    avgPriceSqft: number;
  }>;
}

export function buildClosedSalesSnapshot(
  area: string,
  soldListings: ULSListing[],
  totalSoldCount: number,
  totalActiveCount?: number,
): ClosedSalesSnapshot {
  const median = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.length % 2 === 0
      ? (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2
      : arr[Math.floor(arr.length / 2)];

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  // Sold prices (use closePrice if available, fallback to currentListPrice)
  const soldPrices = soldListings
    .map(l => l.financials?.closePrice || l.financials?.currentListPrice)
    .filter((p): p is number => typeof p === 'number' && p > 0)
    .sort((a, b) => a - b);

  // Sold price per sqft
  const soldPriceSqft = soldListings
    .filter(l => (l.financials?.closePrice || l.financials?.currentListPrice) > 0 && l.property?.livingArea?.value > 0)
    .map(l => (l.financials.closePrice || l.financials.currentListPrice) / l.property.livingArea.value);

  // Sold-to-list ratio
  const soldToListRatios = soldListings
    .filter(l => l.financials?.closePrice > 0 && l.financials?.originalListPrice > 0)
    .map(l => l.financials.closePrice / l.financials.originalListPrice);

  // Days to close (listDate → closeDate)
  const daysToClose = soldListings
    .filter(l => l.listDate && l.closeDate)
    .map(l => {
      const listed = new Date(l.listDate).getTime();
      const closed = new Date(l.closeDate).getTime();
      return Math.floor((closed - listed) / (1000 * 60 * 60 * 24));
    })
    .filter(d => d >= 0 && d < 730);

  // Monthly trends — group sold listings by closeDate month
  const byMonth: Record<string, ULSListing[]> = {};
  for (const l of soldListings) {
    if (!l.closeDate) continue;
    const month = l.closeDate.substring(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(l);
  }

  const monthlyTrends = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, items]) => {
      const prices = items
        .map(l => l.financials?.closePrice || l.financials?.currentListPrice)
        .filter((p): p is number => typeof p === 'number' && p > 0)
        .sort((a, b) => a - b);
      const sqftPrices = items
        .filter(l => (l.financials?.closePrice || l.financials?.currentListPrice) > 0 && l.property?.livingArea?.value > 0)
        .map(l => (l.financials.closePrice || l.financials.currentListPrice) / l.property.livingArea.value);
      return {
        month,
        count: items.length,
        medianPrice: median(prices),
        avgPriceSqft: Math.round(avg(sqftPrices)),
      };
    });

  // Absorption rate: total sold over period / months / active count
  let absorptionRate: number | null = null;
  if (totalActiveCount && totalActiveCount > 0 && monthlyTrends.length > 0) {
    const avgSoldPerMonth = totalSoldCount / Math.max(monthlyTrends.length, 1);
    absorptionRate = Math.round((totalActiveCount / avgSoldPerMonth) * 10) / 10; // months of inventory
  }

  return {
    area,
    totalSold: totalSoldCount,
    medianSoldPrice: median(soldPrices),
    avgSoldPricePerSqft: Math.round(avg(soldPriceSqft)),
    avgSoldToListRatio: soldToListRatios.length > 0 ? Math.round(avg(soldToListRatios) * 1000) / 10 : 0,
    avgDaysToClose: Math.round(avg(daysToClose)),
    absorptionRate,
    monthlyTrends,
  };
}

export function formatClosedSalesForAI(snapshot: ClosedSalesSnapshot): string {
  const lines = [
    `CLOSED SALES DATA for ${snapshot.area} (last 90 days, from KW ULS):`,
    `- Total Closed Sales: ${snapshot.totalSold.toLocaleString()}`,
    `- Median Sold Price: $${snapshot.medianSoldPrice.toLocaleString()}`,
    `- Avg Sold $/SqFt: $${snapshot.avgSoldPricePerSqft}`,
  ];

  if (snapshot.avgSoldToListRatio > 0) {
    lines.push(`- Avg Sold-to-List Price Ratio: ${snapshot.avgSoldToListRatio}%`);
  }
  if (snapshot.avgDaysToClose > 0) {
    lines.push(`- Avg Days to Close: ${snapshot.avgDaysToClose}`);
  }
  if (snapshot.absorptionRate !== null) {
    lines.push(`- Months of Inventory (Absorption Rate): ${snapshot.absorptionRate}`);
  }

  if (snapshot.monthlyTrends.length > 0) {
    lines.push(`- Monthly Price Trends:`);
    for (const m of snapshot.monthlyTrends) {
      lines.push(`  • ${m.month}: ${m.count} sales, median $${m.medianPrice.toLocaleString()}, $${m.avgPriceSqft}/sqft`);
    }
  }

  return lines.join('\n');
}
