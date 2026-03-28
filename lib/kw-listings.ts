// ─── KW Listings API Types ───────────────────────────────────────────────────
// Placeholder types for future KW Unified Listing Service (ULS) integration.
// API endpoint: partners.api.kw.com/uls
// Auth: OpenID Connect via sts.devhub.kw.com

export interface KWListing {
  mlsNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  listDate: string;
  status: 'active' | 'pending' | 'sold' | 'withdrawn';
  beds: number;
  baths: number;
  sqft: number;
  propertyType: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'land';
  daysOnMarket: number;
  listingAgent?: string;
  listingOffice?: string;
}

export interface KWMarketSnapshot {
  market: string;
  period: string;
  activeListings: number;
  newListings: number;
  closedSales: number;
  medianPrice: number;
  averageDaysOnMarket: number;
  monthsOfSupply: number;
  pricePerSqft: number;
}

export interface KWListingsSearchParams {
  market?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: KWListing['propertyType'];
  status?: KWListing['status'];
  limit?: number;
  offset?: number;
}

export interface KWListingsResponse {
  listings: KWListing[];
  total: number;
  snapshot?: KWMarketSnapshot;
}
