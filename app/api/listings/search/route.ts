import { NextRequest, NextResponse } from 'next/server';
import type { ULSSearchRequest, ULSSearchFilters } from '@/lib/kw-listings';
import { searchListings } from '@/lib/kw-uls-client';

// ─── POST handler — proxies search to KW ULS ────────────────────────────────

export async function POST(request: NextRequest) {
  const clientId = process.env.KW_ULS_CLIENT_ID;
  const clientSecret = process.env.KW_ULS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: { message: 'KW_ULS_CLIENT_ID and KW_ULS_CLIENT_SECRET are not configured.' }, stub: true },
      { status: 503 }
    );
  }

  let searchBody: ULSSearchRequest;
  try {
    searchBody = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid request body' } }, { status: 400 });
  }

  try {
    const data = await searchListings(searchBody);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('KW ULS error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch listings';
    const hint = message.includes('403')
      ? ' — Your client app may need syndication access provisioned in KW DevHub.'
      : '';
    return NextResponse.json(
      { error: { message: `${message}${hint}` } },
      { status: 502 }
    );
  }
}

// ─── GET handler — convenience for simple queries ────────────────────────────

export async function GET(request: NextRequest) {
  const clientId = process.env.KW_ULS_CLIENT_ID;
  const clientSecret = process.env.KW_ULS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: { message: 'KW ULS credentials not configured.' }, stub: true },
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const city = searchParams.get('city') || undefined;
  const state = searchParams.get('state') || undefined;
  const status = searchParams.get('status') || 'active';
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const searchBody: ULSSearchRequest = {
    query: {
      filters: {
        listingStatus: status.split(',') as ULSSearchFilters['listingStatus'],
        ...(city ? { city } : {}),
        ...(state ? { stateProv: state } : {}),
      },
    },
    sort: { sortField: 'listingUpdateDate', sortOrder: 'desc' },
    pagination: { max: Math.min(limit, 100), offset },
  };

  const fakeReq = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchBody),
  });

  return POST(fakeReq);
}
