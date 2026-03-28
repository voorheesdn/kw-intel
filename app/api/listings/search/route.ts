import { NextRequest, NextResponse } from 'next/server';
import type { KWListingsResponse } from '@/lib/kw-listings';

// Stub route for KW Unified Listing Service integration.
// Returns placeholder data until real API credentials are configured.

export async function GET(request: NextRequest) {
  const clientId = process.env.KW_ULS_CLIENT_ID;
  const clientSecret = process.env.KW_ULS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // Return stub data with a flag indicating it's placeholder
    const stub: KWListingsResponse & { stub: true } = {
      stub: true,
      listings: [],
      total: 0,
      snapshot: {
        market: request.nextUrl.searchParams.get('market') || 'National',
        period: new Date().toISOString().slice(0, 7),
        activeListings: 0,
        newListings: 0,
        closedSales: 0,
        medianPrice: 0,
        averageDaysOnMarket: 0,
        monthsOfSupply: 0,
        pricePerSqft: 0,
      },
    };

    return NextResponse.json(stub, {
      headers: { 'X-KW-Stub': 'true' },
    });
  }

  // TODO: Implement real KW ULS API integration
  // 1. Obtain access token from sts.devhub.kw.com via OpenID Connect
  // 2. Call partners.api.kw.com/uls with bearer token
  // 3. Map response to KWListingsResponse

  return NextResponse.json(
    { error: { message: 'KW ULS integration not yet implemented' } },
    { status: 501 }
  );
}
