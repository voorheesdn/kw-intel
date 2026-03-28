'use client';

import { useState, useCallback } from 'react';
import { IconSearch, IconBarChart, IconHome, IconLoader } from '@/components/ui/Icons';
import type { ULSListing, ULSListStatus } from '@/lib/kw-listings';
import { toListingSummary } from '@/lib/kw-listings';
import type { ListingSummary } from '@/lib/kw-listings';

// ─── Property type labels ────────────────────────────────────────────────────

const PROPERTY_LABELS: Record<string, string> = {
  singleFamilyDetached: 'Single Family',
  singleFamilyAttached: 'Attached',
  condominium: 'Condo',
  townhouse: 'Townhouse',
  duplex: 'Duplex',
  triplex: 'Triplex',
  quadruplex: 'Quadruplex',
  multiFamily: 'Multi-Family',
  apartment: 'Apartment',
  manufacturedHome: 'Manufactured',
  mobileHome: 'Mobile Home',
  ranch: 'Ranch',
  farm: 'Farm',
  unimprovedLand: 'Land',
  commercial: 'Commercial',
  other: 'Other',
};

// ─── Status filters ──────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ULSListStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { value: 'comingSoon', label: 'Coming Soon', color: 'bg-blue-100 text-blue-700' },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stub, setStub] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search filters
  const [city, setCity] = useState('Austin');
  const [state, setState] = useState('TX');
  const [status, setStatus] = useState<ULSListStatus>('active');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minBeds, setMinBeds] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [sortField, setSortField] = useState('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const filters: Record<string, unknown> = {
        listingStatus: [status],
        listingCategory: ['sale'],
        mustHavePhotos: true,
      };
      if (city.trim()) filters.city = city.trim();
      if (state.trim()) filters.stateProv = state.trim().toUpperCase();
      if (minPrice) filters.price = { ...((filters.price as object) || {}), min: parseInt(minPrice) };
      if (maxPrice) filters.price = { ...((filters.price as object) || {}), max: parseInt(maxPrice) };
      if (minBeds) filters.bedrooms = { min: parseInt(minBeds) };
      if (propertyType) filters.propertySubtype = [propertyType];

      const res = await fetch('/api/listings/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: { filters },
          sort: { sortField, sortOrder },
          pagination: { max: 24, offset: 0 },
        }),
      });
      const json = await res.json();
      if (json.stub) { setStub(true); return; }
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch listings');

      const mapped = (json.results || []).map((l: ULSListing) => toListingSummary(l));
      setListings(mapped);
      const t = typeof json.pagination?.total === 'object'
        ? json.pagination.total.value
        : json.pagination?.total || 0;
      setTotal(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [city, state, status, minPrice, maxPrice, minBeds, propertyType, sortField, sortOrder]);

  // Market stats from current results
  const stats = listings.length > 0 ? {
    medianPrice: (() => {
      const prices = listings.map(l => l.price).filter(p => p > 0).sort((a, b) => a - b);
      return prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;
    })(),
    avgSqft: (() => {
      const sqfts = listings.filter(l => l.sqft > 0).map(l => l.sqft);
      return sqfts.length > 0 ? Math.round(sqfts.reduce((a, b) => a + b, 0) / sqfts.length) : 0;
    })(),
    avgPriceSqft: (() => {
      const vals = listings.filter(l => l.price > 0 && l.sqft > 0).map(l => l.price / l.sqft);
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    })(),
    kwCount: listings.filter(l => l.isKwListing).length,
  } : null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-72 bg-[#1A1A1A] flex flex-col shrink-0">
        {/* Logo + Nav */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#E8453C] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs tracking-tight">KW</span>
            </div>
            <div>
              <div className="text-white font-semibold text-sm leading-tight">KW Intelligence</div>
              <div className="text-white/40 font-mono text-xs">Product &amp; Innovation</div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <a href="/" className="text-white/40 text-xs font-medium hover:text-white/80 flex items-center gap-1">
              <IconSearch /> Workbench
            </a>
            <a href="/market" className="text-white/40 text-xs font-medium hover:text-white/80 flex items-center gap-1">
              <IconBarChart /> Market Data
            </a>
            <a href="/listings" className="text-white/90 text-xs font-medium hover:text-white flex items-center gap-1">
              <IconHome /> Listings
            </a>
          </div>
        </div>

        {/* Search Filters */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="font-mono text-xs text-white/30 uppercase tracking-widest mb-4">Search Filters</div>

          {/* Location */}
          <div className="mb-4">
            <label className="text-xs text-white/50 mb-1 block">Location</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#E8453C]"
              />
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="ST"
                maxLength={2}
                className="w-14 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#E8453C] uppercase"
              />
            </div>
          </div>

          {/* Status */}
          <div className="mb-4">
            <label className="text-xs text-white/50 mb-1 block">Status</label>
            <div className="flex gap-1">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    status === opt.value
                      ? 'bg-[#E8453C] text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-4">
            <label className="text-xs text-white/50 mb-1 block">Price Range</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#E8453C]"
              />
              <span className="text-white/30 text-xs">to</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#E8453C]"
              />
            </div>
          </div>

          {/* Beds */}
          <div className="mb-4">
            <label className="text-xs text-white/50 mb-1 block">Min Bedrooms</label>
            <div className="flex gap-1">
              {['', '1', '2', '3', '4', '5'].map(val => (
                <button
                  key={val}
                  onClick={() => setMinBeds(val)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    minBeds === val
                      ? 'bg-[#E8453C] text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {val || 'Any'}
                </button>
              ))}
            </div>
          </div>

          {/* Property Type */}
          <div className="mb-4">
            <label className="text-xs text-white/50 mb-1 block">Property Type</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E8453C]"
            >
              <option value="" className="bg-[#1A1A1A]">All Types</option>
              {Object.entries(PROPERTY_LABELS).map(([val, label]) => (
                <option key={val} value={val} className="bg-[#1A1A1A]">{label}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="mb-4">
            <label className="text-xs text-white/50 mb-1 block">Sort By</label>
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E8453C]"
              >
                <option value="price" className="bg-[#1A1A1A]">Price</option>
                <option value="listingUpdateDate" className="bg-[#1A1A1A]">Date Listed</option>
                <option value="livingArea" className="bg-[#1A1A1A]">Size</option>
                <option value="daysOnSite" className="bg-[#1A1A1A]">Days on Market</option>
              </select>
              <button
                onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/50 hover:bg-white/10 transition-colors"
                title={sortOrder === 'desc' ? 'High to Low' : 'Low to High'}
              >
                {sortOrder === 'desc' ? '\u2193' : '\u2191'}
              </button>
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={search}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-[#E8453C] text-white text-sm font-semibold rounded-lg hover:bg-[#d0382f] disabled:opacity-40 transition-colors"
          >
            {loading ? 'Searching...' : 'Search Listings'}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Listings Intelligence</h1>
              <p className="font-mono text-xs text-gray-400 mt-0.5">
                KW Unified Listing Service &middot; Real-time listing data
              </p>
            </div>
            {total > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</div>
                <div className="font-mono text-xs text-gray-400">total listings</div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
            <div className="flex items-center gap-6">
              <div>
                <span className="font-mono text-xs text-gray-400">Median Price</span>
                <span className="ml-2 text-sm font-semibold text-gray-900">${stats.medianPrice.toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div>
                <span className="font-mono text-xs text-gray-400">Avg Size</span>
                <span className="ml-2 text-sm font-semibold text-gray-900">{stats.avgSqft.toLocaleString()} sqft</span>
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div>
                <span className="font-mono text-xs text-gray-400">Avg $/sqft</span>
                <span className="ml-2 text-sm font-semibold text-gray-900">${stats.avgPriceSqft}</span>
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div>
                <span className="font-mono text-xs text-gray-400">KW Listings</span>
                <span className="ml-2 text-sm font-semibold text-[#E8453C]">{stats.kwCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {stub && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <IconHome />
              </div>
              <h3 className="text-lg font-semibold text-gray-700">KW Listings API Not Connected</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Add KW_ULS_CLIENT_ID and KW_ULS_CLIENT_SECRET to your environment variables,
                then ensure your app has syndication access provisioned in KW DevHub.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-mono text-xs text-red-400 uppercase tracking-wider mb-1">Error</div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="text-[#2D7DD2]"><IconLoader /></div>
              <p className="font-mono text-sm text-gray-500">Searching KW listings...</p>
            </div>
          )}

          {!loading && !hasSearched && !stub && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <IconHome />
              </div>
              <p className="font-semibold text-gray-600">KW Listings Intelligence</p>
              <p className="text-sm text-gray-400 max-w-xs">
                Search active KW listings by location, price, property type, and more.
                Set your filters in the sidebar and click Search.
              </p>
            </div>
          )}

          {!loading && hasSearched && listings.length === 0 && !error && !stub && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <p className="text-sm text-gray-500">No listings found matching your criteria</p>
              <p className="text-xs text-gray-400">Try adjusting your filters</p>
            </div>
          )}

          {!loading && listings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {listings.map((l) => (
                <div key={l.id} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {l.photoUrl ? (
                    <div className="h-44 bg-gray-100 overflow-hidden relative">
                      <img src={l.photoUrl} alt={l.address} className="w-full h-full object-cover" />
                      {l.isKwListing && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#E8453C] text-white text-xs font-bold rounded">
                          KW
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-44 bg-gray-50 flex items-center justify-center text-gray-300">
                      <IconHome />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-bold text-gray-900">
                        ${l.price.toLocaleString()}
                      </span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                        l.status === 'active' ? 'bg-green-100 text-green-700' :
                        l.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        l.status === 'comingSoon' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {l.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{l.address}</p>
                    <p className="text-xs text-gray-400">{l.city}, {l.state} {l.zip}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{l.beds} bd</span>
                      <span>{l.baths} ba</span>
                      {l.sqft > 0 && <span>{l.sqft.toLocaleString()} sqft</span>}
                      {l.sqft > 0 && l.price > 0 && (
                        <span className="text-gray-400">${Math.round(l.price / l.sqft)}/sqft</span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {PROPERTY_LABELS[l.propertyType] || l.propertyType}
                      {l.mlsNumber && <span className="ml-2">MLS# {l.mlsNumber}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400 truncate flex-1">{l.agentName || l.officeName}</span>
                      {l.listDate && (
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {new Date(l.listDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
