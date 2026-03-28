// ─── KW ULS API Client (server-side only) ────────────────────────────────────
// Shared auth + search logic used by both /api/listings and /api/intel routes.

import type { ULSSearchRequest, ULSSearchResponse, ULSListing } from './kw-listings';

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

  const res = await fetch(`${ULS_BASE}/listings/syndication/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
