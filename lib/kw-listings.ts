// ─── KW Unified Listing Service (ULS) Types ─────────────────────────────────
// API: https://partners.api.kw.com/uls
// Auth: OpenID Connect via https://sts.devhub.kw.com

// ─── API Response Types (mapped from OpenAPI spec) ───────────────────────────

export interface ULSAddress {
  displayAddress: string;
  streetName: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  state: string;
  unitNumber: string;
  country: string;
  primaryAddress: string;
  secondaryAddress: string;
}

export interface ULSPhoto {
  photoOrder: number;
  photoShortDescription: string;
  photoUrl: string;
}

export interface ULSFinancials {
  currentListPrice: number;
  originalListPrice: number;
  closePrice: number;
  currencyCode: string;
}

export interface ULSPropertyDetails {
  yearBuilt: number;
  lotSize: { value: number; unitType: string };
  livingArea: { value: number; unitType: string };
  fullBath: number;
  halfBaths: number;
  totalBath: number;
  totalBed: number;
  roomsTotal: number;
  stories: number;
  hasGarage: boolean;
}

export interface ULSRepresentation {
  listAgentOffice: {
    listAgentFullName: string;
    listOfficeName: string;
    listAgentEmail: string;
    listAgentPreferredPhone: string;
  };
  brokerage: {
    name: string;
    email: string;
    phone: string;
  };
}

export type ULSListStatus =
  | 'active' | 'pending' | 'sold' | 'activeUnderContract'
  | 'comingSoon' | 'pendingContingent' | 'pendingTakingBackups'
  | 'pendingDoNotShow' | 'temporarilyOffMarket' | 'hold'
  | 'withdrawn' | 'cancelled' | 'delete' | 'expired'
  | 'leased' | 'draft' | 'closed' | 'offMarket'
  | 'internalActive' | 'internalExpired';

export type ULSPropertyType =
  | 'residential' | 'commercial' | 'lotsAndLand' | 'residentialIncome'
  | 'farmAndAgriculture' | 'commonInterest' | 'manufacturedPark'
  | 'vacationOwnership' | 'businessOpportunity' | 'other';

export type ULSPropertySubtype =
  | 'singleFamilyDetached' | 'singleFamilyAttached' | 'condominium'
  | 'townhouse' | 'duplex' | 'triplex' | 'quadruplex' | 'multiFamily'
  | 'apartment' | 'manufacturedHome' | 'mobileHome' | 'ranch' | 'farm'
  | 'cabin' | 'unimprovedLand' | 'commercial' | 'office' | 'retail'
  | 'industrial' | 'warehouse' | 'mixedUse' | 'other';

export type ULSListCategory = 'sale' | 'sold' | 'rent' | 'rented' | 'offMarket' | 'saleAndRent' | 'other';

export interface ULSListing {
  id: string;
  address: ULSAddress;
  coordinates: number[];
  description: string;
  financials: ULSFinancials;
  listDate: string;
  listStatus: ULSListStatus;
  listCategory: ULSListCategory;
  listType: string;
  mlsNumber: string;
  mlsName: string;
  mlsId: string;
  propertyType: ULSPropertyType;
  propertySubtype: ULSPropertySubtype;
  photos: ULSPhoto[];
  property: ULSPropertyDetails;
  representation: ULSRepresentation;
  luxuryHome: boolean;
  kw: {
    isKwListing: boolean;
    marketCenter: number;
    listKwUid: string;
    kwUpdatedAt: string;
  };
}

export interface ULSSearchResponse {
  pagination: {
    max: number;
    total: number | { value: number; relation: string };
    offset: number;
  };
  results: ULSListing[];
}

// ─── Search Request Types ────────────────────────────────────────────────────

export interface ULSSearchFilters {
  listingStatus?: ULSListStatus[];
  listingCategory?: ULSListCategory[];
  propertyType?: ULSPropertyType[];
  propertySubtype?: ULSPropertySubtype[];
  price?: { min?: number; max?: number };
  bedrooms?: { min?: number; max?: number };
  bathrooms?: { min?: number; max?: number };
  homeSize?: { min?: number; max?: number };
  city?: string;
  stateProv?: string;
  postalCode?: string;
  kwListing?: boolean;
  kwAgent?: boolean;
  maxListingAgeInDays?: number;
  mustHavePhotos?: boolean;
}

export interface ULSSearchRequest {
  query?: {
    filters?: ULSSearchFilters;
    location?: {
      boundaryIds?: string[];
      geometry?: {
        coordinates: number[][] | number[][][];
        type: 'Polygon' | 'MultiPolygon' | 'Point';
      };
      viewport?: { bounds: number[] };
      geoNear?: { coordinates: number[]; radiusMi: number };
    };
  };
  sort?: {
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  };
  pagination?: {
    max?: number;
    offset?: number;
  };
}

// ─── Simplified view types for dashboard ─────────────────────────────────────

export interface ListingSummary {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  status: ULSListStatus;
  propertyType: string;
  listDate: string;
  photoUrl: string | null;
  agentName: string;
  officeName: string;
  mlsNumber: string;
  isKwListing: boolean;
}

export function toListingSummary(l: ULSListing): ListingSummary {
  return {
    id: l.id,
    address: l.address?.displayAddress || '',
    city: l.address?.city || '',
    state: l.address?.state || '',
    zip: l.address?.postalCode || '',
    price: l.financials?.currentListPrice || 0,
    beds: l.property?.totalBed || 0,
    baths: l.property?.totalBath || 0,
    sqft: l.property?.livingArea?.value || 0,
    status: l.listStatus,
    propertyType: l.propertySubtype || l.propertyType || '',
    listDate: l.listDate || '',
    photoUrl: l.photos?.[0]?.photoUrl || null,
    agentName: l.representation?.listAgentOffice?.listAgentFullName || '',
    officeName: l.representation?.listAgentOffice?.listOfficeName || '',
    mlsNumber: l.mlsNumber || '',
    isKwListing: l.kw?.isKwListing || false,
  };
}
