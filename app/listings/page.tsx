'use client';

import { useState, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { IconSearch, IconBarChart, IconHome, IconLoader } from '@/components/ui/Icons';
import type { ULSListing } from '@/lib/kw-listings';
import { toListingSummary } from '@/lib/kw-listings';
import type { ListingSummary } from '@/lib/kw-listings';

// ─── Constants ───────────────────────────────────────────────────────────────

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
  ranch: 'Ranch',
  farm: 'Farm',
  unimprovedLand: 'Land',
  commercial: 'Commercial',
  residential: 'Residential',
  other: 'Other',
};

const CHART_COLORS = ['#E8453C', '#2D7DD2', '#45B69C', '#F4A261', '#9B59B6', '#34495E', '#E67E22', '#1ABC9C'];

const PRICE_BUCKETS = [
  { label: '<$200K', min: 0, max: 200000 },
  { label: '$200-400K', min: 200000, max: 400000 },
  { label: '$400-600K', min: 400000, max: 600000 },
  { label: '$600-800K', min: 600000, max: 800000 },
  { label: '$800K-1M', min: 800000, max: 1000000 },
  { label: '$1-1.5M', min: 1000000, max: 1500000 },
  { label: '$1.5-2M', min: 1500000, max: 2000000 },
  { label: '$2M+', min: 2000000, max: Infinity },
];

// ─── Stats helpers ───────────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

interface MarketStats {
  totalActive: number;
  medianPrice: number;
  avgPrice: number;
  avgPriceSqft: number;
  medianSqft: number;
  avgDOM: number;
  kwListings: number;
  kwPercent: number;
  priceDistribution: { name: string; count: number }[];
  propertyMix: { name: string; value: number }[];
  bedroomMix: { name: string; count: number }[];
  priceSqftByType: { name: string; value: number }[];
  priceRange: { low: number; high: number };
  topListings: ListingSummary[];
}

function computeStats(listings: ListingSummary[], totalCount: number): MarketStats {
  const prices = listings.map(l => l.price).filter(p => p > 0);
  const sqfts = listings.filter(l => l.sqft > 0).map(l => l.sqft);
  const priceSqfts = listings.filter(l => l.price > 0 && l.sqft > 0).map(l => l.price / l.sqft);
  const kwCount = listings.filter(l => l.isKwListing).length;

  const doms = listings.filter(l => l.listDate).map(l => {
    const days = Math.floor((Date.now() - new Date(l.listDate).getTime()) / 86400000);
    return days >= 0 && days < 3650 ? days : null;
  }).filter((d): d is number => d !== null);

  // Price distribution
  const priceDistribution = PRICE_BUCKETS.map(bucket => ({
    name: bucket.label,
    count: prices.filter(p => p >= bucket.min && p < bucket.max).length,
  })).filter(b => b.count > 0);

  // Property mix
  const typeCounts: Record<string, number> = {};
  listings.forEach(l => {
    const t = PROPERTY_LABELS[l.propertyType] || l.propertyType || 'Other';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const propertyMix = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // Bedroom mix
  const bedCounts: Record<string, number> = {};
  listings.forEach(l => {
    const key = l.beds >= 5 ? '5+' : `${l.beds}`;
    bedCounts[key] = (bedCounts[key] || 0) + 1;
  });
  const bedroomMix = ['0', '1', '2', '3', '4', '5+']
    .filter(k => bedCounts[k])
    .map(k => ({ name: `${k} Bed`, count: bedCounts[k] }));

  // Price/sqft by property type
  const typeAggr: Record<string, number[]> = {};
  listings.filter(l => l.price > 0 && l.sqft > 0).forEach(l => {
    const t = PROPERTY_LABELS[l.propertyType] || l.propertyType || 'Other';
    if (!typeAggr[t]) typeAggr[t] = [];
    typeAggr[t].push(l.price / l.sqft);
  });
  const priceSqftByType = Object.entries(typeAggr)
    .map(([name, vals]) => ({ name, value: Math.round(avg(vals)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return {
    totalActive: totalCount,
    medianPrice: median(prices),
    avgPrice: Math.round(avg(prices)),
    avgPriceSqft: Math.round(avg(priceSqfts)),
    medianSqft: median(sqfts),
    avgDOM: Math.round(avg(doms)),
    kwListings: kwCount,
    kwPercent: listings.length > 0 ? Math.round((kwCount / listings.length) * 100) : 0,
    priceDistribution,
    propertyMix,
    bedroomMix,
    priceSqftByType,
    priceRange: { low: Math.min(...(prices.length ? prices : [0])), high: Math.max(...(prices.length ? prices : [0])) },
    topListings: listings.slice(0, 6),
  };
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
      <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stub, setStub] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showListings, setShowListings] = useState(false);

  // Search filters
  const [city, setCity] = useState('Austin');
  const [state, setState] = useState('TX');

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const res = await fetch('/api/listings/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: {
            filters: {
              listingStatus: ['active'],
              listingCategory: ['sale'],
              ...(city.trim() ? { city: city.trim() } : {}),
              ...(state.trim() ? { stateProv: state.trim().toUpperCase() } : {}),
            },
          },
          sort: { sortField: 'price', sortOrder: 'desc' },
          pagination: { max: 100, offset: 0 },
        }),
      });
      const json = await res.json();
      if (json.stub) { setStub(true); return; }
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch listings');

      const mapped = (json.results || []).map((l: ULSListing) => toListingSummary(l));
      setListings(mapped);

      const totalCount = typeof json.pagination?.total === 'object'
        ? json.pagination.total.value
        : json.pagination?.total || mapped.length;

      setStats(computeStats(mapped, totalCount));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [city, state]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-[#1A1A1A] flex flex-col shrink-0">
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

        {/* Market Selector */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="font-mono text-xs text-white/30 uppercase tracking-widest mb-3">Select Market</div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              onKeyDown={(e) => e.key === 'Enter' && search()}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#E8453C]"
            />
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="ST"
              maxLength={2}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              className="w-14 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#E8453C] uppercase"
            />
          </div>
          <button
            onClick={search}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-[#E8453C] text-white text-sm font-semibold rounded-lg hover:bg-[#d0382f] disabled:opacity-40 transition-colors"
          >
            {loading ? 'Loading...' : 'Load Market Data'}
          </button>
        </div>

        {/* Quick Stats Sidebar */}
        {stats && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="font-mono text-xs text-white/30 uppercase tracking-widest mb-3">Market Summary</div>
            {[
              { label: 'Active Listings', value: stats.totalActive.toLocaleString() },
              { label: 'Median Price', value: `$${stats.medianPrice.toLocaleString()}` },
              { label: 'Avg $/sqft', value: `$${stats.avgPriceSqft}` },
              { label: 'Avg DOM', value: `${stats.avgDOM} days` },
              { label: 'Median Size', value: `${stats.medianSqft.toLocaleString()} sqft` },
              { label: 'KW Share', value: `${stats.kwPercent}% (${stats.kwListings})` },
              { label: 'Price Range', value: `$${(stats.priceRange.low / 1000).toFixed(0)}K – $${(stats.priceRange.high / 1000000).toFixed(1)}M` },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-2 py-1.5 rounded text-white/50 hover:bg-white/5 transition-colors">
                <span className="text-xs">{item.label}</span>
                <span className="font-mono text-xs text-white/70">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {stats ? `${city}, ${state.toUpperCase()} Market Dashboard` : 'Listings Intelligence'}
              </h1>
              <p className="font-mono text-xs text-gray-400 mt-0.5">
                KW Unified Listing Service &middot; Real-time market analytics
              </p>
            </div>
            {stats && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowListings(!showListings)}
                  className={`px-4 py-2 text-xs font-mono rounded-lg transition-colors ${
                    showListings
                      ? 'bg-[#E8453C] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {showListings ? 'Show Dashboard' : 'View Listings'}
                </button>
                <button
                  onClick={search}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-mono rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Not connected state */}
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
              <p className="font-mono text-sm text-gray-500">Loading market data from KW listings...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !hasSearched && !stub && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <IconHome />
              </div>
              <p className="font-semibold text-gray-600">Market Analytics Dashboard</p>
              <p className="text-sm text-gray-400 max-w-sm">
                Enter a city and state in the sidebar to load market stats, price distributions,
                property mix, and more from live KW listing data.
              </p>
            </div>
          )}

          {/* ═══ DASHBOARD VIEW ═══ */}
          {!loading && stats && !showListings && (
            <>
              {/* Top-level stats */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
                <StatCard label="Active Listings" value={stats.totalActive.toLocaleString()} />
                <StatCard label="Median List Price" value={`$${stats.medianPrice.toLocaleString()}`} />
                <StatCard label="Avg $/SqFt" value={`$${stats.avgPriceSqft}`} />
                <StatCard label="Avg Days on Market" value={`${stats.avgDOM}`} sub="days" />
                <StatCard label="Median Size" value={`${stats.medianSqft.toLocaleString()}`} sub="sqft" />
                <StatCard
                  label="KW Market Share"
                  value={`${stats.kwPercent}%`}
                  sub={`${stats.kwListings} of ${listings.length} sampled`}
                />
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                {/* Price Distribution */}
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
                  <div className="font-semibold text-sm text-gray-900 mb-4">Price Distribution</div>
                  {stats.priceDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={stats.priceDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} tickLine={false} axisLine={{ stroke: '#e5e5e5' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e5e5' }} />
                        <Bar dataKey="count" name="Listings" fill="#E8453C" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data</div>
                  )}
                </div>

                {/* Property Type Mix */}
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
                  <div className="font-semibold text-sm text-gray-900 mb-4">Property Type Mix</div>
                  {stats.propertyMix.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={260}>
                        <PieChart>
                          <Pie
                            data={stats.propertyMix}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={50}
                          >
                            {stats.propertyMix.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5">
                        {stats.propertyMix.map((item, i) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-xs text-gray-700 flex-1 truncate">{item.name}</span>
                            <span className="font-mono text-xs text-gray-500">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data</div>
                  )}
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                {/* Bedroom Distribution */}
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
                  <div className="font-semibold text-sm text-gray-900 mb-4">Bedroom Distribution</div>
                  {stats.bedroomMix.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={stats.bedroomMix} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} tickLine={false} axisLine={{ stroke: '#e5e5e5' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e5e5' }} />
                        <Bar dataKey="count" name="Listings" fill="#2D7DD2" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data</div>
                  )}
                </div>

                {/* Price/SqFt by Property Type */}
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
                  <div className="font-semibold text-sm text-gray-900 mb-4">Avg $/SqFt by Property Type</div>
                  {stats.priceSqftByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={stats.priceSqftByType} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#999' }} tickLine={false} axisLine={{ stroke: '#e5e5e5' }} tickFormatter={(v) => `$${v}`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e5e5' }} formatter={(v) => `$${v}/sqft`} />
                        <Bar dataKey="value" name="$/SqFt" fill="#45B69C" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data</div>
                  )}
                </div>
              </div>

              {/* Top Listings Table */}
              {stats.topListings.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-semibold text-sm text-gray-900">Top Listings by Price</div>
                    <button
                      onClick={() => setShowListings(true)}
                      className="text-xs font-mono text-[#2D7DD2] hover:underline"
                    >
                      View all {listings.length} listings &rarr;
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left font-mono text-xs text-gray-400 uppercase tracking-wider pb-2 pr-4">Address</th>
                          <th className="text-right font-mono text-xs text-gray-400 uppercase tracking-wider pb-2 px-4">Price</th>
                          <th className="text-center font-mono text-xs text-gray-400 uppercase tracking-wider pb-2 px-4">Beds/Bath</th>
                          <th className="text-right font-mono text-xs text-gray-400 uppercase tracking-wider pb-2 px-4">SqFt</th>
                          <th className="text-right font-mono text-xs text-gray-400 uppercase tracking-wider pb-2 px-4">$/SqFt</th>
                          <th className="text-left font-mono text-xs text-gray-400 uppercase tracking-wider pb-2 pl-4">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topListings.map(l => (
                          <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2.5 pr-4">
                              <div className="text-gray-900 truncate max-w-xs">{l.address}</div>
                              <div className="text-xs text-gray-400">{l.city}, {l.state} {l.zip}</div>
                            </td>
                            <td className="text-right py-2.5 px-4 font-semibold text-gray-900">${l.price.toLocaleString()}</td>
                            <td className="text-center py-2.5 px-4 text-gray-700">{l.beds}/{l.baths}</td>
                            <td className="text-right py-2.5 px-4 text-gray-700">{l.sqft > 0 ? l.sqft.toLocaleString() : '—'}</td>
                            <td className="text-right py-2.5 px-4 text-gray-500">
                              {l.sqft > 0 && l.price > 0 ? `$${Math.round(l.price / l.sqft)}` : '—'}
                            </td>
                            <td className="py-2.5 pl-4">
                              <span className="text-xs text-gray-500">{PROPERTY_LABELS[l.propertyType] || l.propertyType}</span>
                              {l.isKwListing && <span className="ml-2 text-xs font-bold text-[#E8453C]">KW</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══ LISTINGS VIEW ═══ */}
          {!loading && stats && showListings && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {listings.map((l) => (
                <div key={l.id} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {l.photoUrl ? (
                    <div className="h-40 bg-gray-100 overflow-hidden relative">
                      <img src={l.photoUrl} alt={l.address} className="w-full h-full object-cover" />
                      {l.isKwListing && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#E8453C] text-white text-xs font-bold rounded">KW</div>
                      )}
                    </div>
                  ) : (
                    <div className="h-40 bg-gray-50 flex items-center justify-center text-gray-300"><IconHome /></div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-bold text-gray-900">${l.price.toLocaleString()}</span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                        l.status === 'active' ? 'bg-green-100 text-green-700' :
                        l.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{l.status}</span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{l.address}</p>
                    <p className="text-xs text-gray-400">{l.city}, {l.state} {l.zip}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{l.beds} bd</span>
                      <span>{l.baths} ba</span>
                      {l.sqft > 0 && <span>{l.sqft.toLocaleString()} sqft</span>}
                      {l.sqft > 0 && l.price > 0 && <span className="text-gray-400">${Math.round(l.price / l.sqft)}/sqft</span>}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400 truncate flex-1">{l.agentName || l.officeName}</span>
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
