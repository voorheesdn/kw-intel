import { NextRequest, NextResponse } from 'next/server';
import type { ULSSearchRequest, ULSSearchResponse, ULSSearchFilters } from '@/lib/kw-listings';

const TOKEN_URL = 'https://partners.api.kw.com/idp/token';
const ULS_BASE = 'https://partners.api.kw.com/uls';

// ─── Token cache (in-memory, reused across requests within the same serverless instance)
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.KW_ULS_CLIENT_ID!;
  const clientSecret = process.env.KW_ULS_CLIENT_SECRET!;

  // Return cached token if still valid (with 60s buffer)
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
      const hint = res.status === 403
        ? ' — Your client app may need syndication access provisioned in KW DevHub.'
        : '';
      return NextResponse.json(
        { error: { message: `ULS API error (${res.status})${hint}`, detail: err } },
        { status: res.status }
      );
    }

    const data: ULSSearchResponse = await res.json();

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('KW ULS error:', err);
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : 'Failed to fetch listings' } },
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
    sort: { sortField: 'price', sortOrder: 'desc' },
    pagination: { max: Math.min(limit, 100), offset },
  };

  // Reuse the POST logic
  const fakeReq = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchBody),
  });

  return POST(fakeReq);
}
