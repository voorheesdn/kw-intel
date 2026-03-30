'use client';

import { useState, useCallback, useEffect } from 'react';
import { IconSearch, IconBarChart, IconHome, IconLoader } from '@/components/ui/Icons';
import type { ULSListing } from '@/lib/kw-listings';
import { toListingSummary } from '@/lib/kw-listings';
import type { ListingSummary } from '@/lib/kw-listings';

// ─── Stats helpers ───────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

interface ActiveStats {
  totalActive: number;
  avgPrice: number;
  avgDOM: number;
  kwListings: number;
  kwPercent: number;
  analyzed: number;
}

interface ClosedStats {
  totalSold: number;
  avgSoldPrice: number;
  avgDaysToClose: number;
  kwSold: number;
  kwSoldPercent: number;
  analyzed: number;
}

function computeActiveStats(listings: ListingSummary[], totalCount: number): ActiveStats {
  const prices = listings.map(l => l.price).filter(p => p > 0);
  const kwCount = listings.filter(l => l.isKwListing).length;

  const doms = listings.filter(l => l.listDate).map(l => {
    const days = Math.floor((Date.now() - new Date(l.listDate).getTime()) / 86400000);
    return days >= 0 && days < 3650 ? days : null;
  }).filter((d): d is number => d !== null);

  return {
    totalActive: totalCount,
    avgPrice: Math.round(avg(prices)),
    avgDOM: Math.round(avg(doms)),
    kwListings: kwCount,
    kwPercent: listings.length > 0 ? Math.round((kwCount / listings.length) * 100 * 10) / 10 : 0,
    analyzed: listings.length,
  };
}

function computeClosedStats(listings: ListingSummary[], totalCount: number): ClosedStats {
  const soldPrices = listings
    .map(l => l.closePrice > 0 ? l.closePrice : l.price)
    .filter(p => p > 0);

  const daysToClose = listings
    .filter(l => l.listDate && l.closeDate)
    .map(l => {
      const days = Math.floor((new Date(l.closeDate).getTime() - new Date(l.listDate).getTime()) / 86400000);
      return days >= 0 && days < 730 ? days : null;
    })
    .filter((d): d is number => d !== null);

  const kwCount = listings.filter(l => l.isKwListing).length;

  return {
    totalSold: totalCount,
    avgSoldPrice: Math.round(avg(soldPrices)),
    avgDaysToClose: Math.round(avg(daysToClose)),
    kwSold: kwCount,
    kwSoldPercent: listings.length > 0 ? Math.round((kwCount / listings.length) * 100 * 10) / 10 : 0,
    analyzed: listings.length,
  };
}

// ─── Big Stat Card ──────────────────────────────────────────────────────────

function BigStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
      <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-4xl font-bold ${accent || 'text-gray-900'}`}>{value}</div>
      {sub && <div className="text-sm text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ListingsPage() {
  const [activeStats, setActiveStats] = useState<ActiveStats | null>(null);
  const [closedStats, setClosedStats] = useState<ClosedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stub, setStub] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search filters
  const [city, setCity] = useState('Austin');
  const [state, setState] = useState('TX');

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setClosedStats(null);
    setActiveStats(null);

    const locationFilters = {
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(state.trim() ? { stateProv: state.trim().toUpperCase() } : {}),
    };

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      // Fetch ALL active + closed sales in parallel (paginated + cached server-side)
      const [activeRes, soldRes] = await Promise.all([
        fetch('/api/listings/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fetchAll: true,
            query: {
              filters: { listingStatus: ['active'], listingCategory: ['sale'], propertyType: ['residential'], ...locationFilters },
            },
            sort: { sortField: 'listingUpdateDate', sortOrder: 'desc' },
          }),
        }),
        fetch('/api/listings/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fetchAll: true,
            query: {
              filters: {
                listingStatusGranular: ['sold', 'closed'],
                listingCategory: ['sold'],
                propertyType: ['residential'],
                closeDate: { min: ninetyDaysAgo },
                ...locationFilters,
              },
            },
            sort: { sortField: 'closeDate', sortOrder: 'desc' },
          }),
        }).catch(() => null),
      ]);

      const activeJson = await activeRes.json();
      if (activeJson.stub) { setStub(true); return; }
      if (!activeRes.ok) throw new Error(activeJson?.error?.message || 'Failed to fetch listings');

      const mapped = (activeJson.results || []).map((l: ULSListing) => toListingSummary(l));

      const totalActiveCount = typeof activeJson.pagination?.total === 'object'
        ? activeJson.pagination.total.value
        : activeJson.pagination?.total || mapped.length;

      setActiveStats(computeActiveStats(mapped, totalActiveCount));

      // Process closed sales
      if (soldRes && soldRes.ok) {
        const soldJson = await soldRes.json();
        if (soldJson.results && soldJson.results.length > 0) {
          const soldMapped = (soldJson.results || []).map((l: ULSListing) => toListingSummary(l));
          const totalSoldCount = typeof soldJson.pagination?.total === 'object'
            ? soldJson.pagination.total.value
            : soldJson.pagination?.total || soldMapped.length;
          setClosedStats(computeClosedStats(soldMapped, totalSoldCount));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [city, state]);

  // Auto-load on mount
  useEffect(() => { search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

        {/* Summary in sidebar */}
        {activeStats && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="font-mono text-xs text-white/30 uppercase tracking-widest mb-3">Active Market</div>
            {[
              { label: 'Total Active', value: activeStats.totalActive.toLocaleString() },
              { label: 'Avg List Price', value: `$${activeStats.avgPrice.toLocaleString()}` },
              { label: 'Avg DOM', value: `${activeStats.avgDOM} days` },
              { label: 'KW Share', value: `${activeStats.kwPercent}% (${activeStats.kwListings.toLocaleString()})` },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-2 py-1.5 rounded text-white/50 hover:bg-white/5 transition-colors">
                <span className="text-xs">{item.label}</span>
                <span className="font-mono text-xs text-white/70">{item.value}</span>
              </div>
            ))}

            {closedStats && (
              <>
                <div className="font-mono text-xs text-white/30 uppercase tracking-widest mt-4 mb-3">Closed Sales (90d)</div>
                {[
                  { label: 'Total Sold', value: closedStats.totalSold.toLocaleString() },
                  { label: 'Avg Sold Price', value: `$${closedStats.avgSoldPrice.toLocaleString()}` },
                  { label: 'Avg Days to Close', value: `${closedStats.avgDaysToClose}` },
                  { label: 'KW Share', value: `${closedStats.kwSoldPercent}% (${closedStats.kwSold.toLocaleString()})` },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between px-2 py-1.5 rounded text-white/50 hover:bg-white/5 transition-colors">
                    <span className="text-xs">{item.label}</span>
                    <span className="font-mono text-xs text-white/70">{item.value}</span>
                  </div>
                ))}
              </>
            )}

            <div className="mt-4 px-2 py-2 rounded bg-white/5 text-white/30 text-xs font-mono">
              Updated nightly at 12:01 AM
            </div>
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
                {activeStats ? `${city}, ${state.toUpperCase()} Market Dashboard` : 'Listings Intelligence'}
              </h1>
              <p className="font-mono text-xs text-gray-400 mt-0.5">
                KW Unified Listing Service &middot; Real-time market analytics
                {activeStats && ` · ${activeStats.analyzed.toLocaleString()} active${closedStats ? ` + ${closedStats.analyzed.toLocaleString()} sold` : ''} listings analyzed`}
              </p>
            </div>
            {activeStats && (
              <span className="font-mono text-xs text-gray-300">
                Updated nightly at 12:01 AM
              </span>
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
                then ensure your app has access provisioned in KW DevHub.
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
              <p className="font-mono text-sm text-gray-500">Loading all listings data...</p>
              <p className="font-mono text-xs text-gray-400">This may take a moment for large markets</p>
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
                Enter a city and state in the sidebar to load market stats from all KW listing data.
              </p>
            </div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {!loading && activeStats && (
            <>
              {/* Active Market Section */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-5 bg-[#E8453C] rounded-full" />
                <span className="font-semibold text-sm text-gray-700">Active Listings</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <BigStat
                  label="Active Listings"
                  value={activeStats.totalActive.toLocaleString()}
                />
                <BigStat
                  label="Avg List Price"
                  value={`$${activeStats.avgPrice.toLocaleString()}`}
                />
                <BigStat
                  label="Avg Days on Market"
                  value={`${activeStats.avgDOM}`}
                  sub="days"
                />
                <BigStat
                  label="KW Market Share"
                  value={`${activeStats.kwPercent}%`}
                  sub={`${activeStats.kwListings.toLocaleString()} KW listings`}
                  accent="text-[#E8453C]"
                />
              </div>

              {/* Closed Sales Section */}
              {closedStats && (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-1 h-5 bg-[#45B69C] rounded-full" />
                    <span className="font-semibold text-sm text-gray-700">Closed Sales — Last 90 Days</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <BigStat
                      label="Total Sold"
                      value={closedStats.totalSold.toLocaleString()}
                      sub="last 90 days"
                    />
                    <BigStat
                      label="Avg Sold Price"
                      value={`$${closedStats.avgSoldPrice.toLocaleString()}`}
                    />
                    <BigStat
                      label="Avg Days to Close"
                      value={`${closedStats.avgDaysToClose}`}
                      sub="days"
                    />
                    <BigStat
                      label="KW Market Share"
                      value={`${closedStats.kwSoldPercent}%`}
                      sub={`${closedStats.kwSold.toLocaleString()} KW closings`}
                      accent="text-[#45B69C]"
                    />
                  </div>
                </>
              )}

              {/* Data note */}
              <div className="text-center text-xs font-mono text-gray-300 mt-8">
                Based on {activeStats.analyzed.toLocaleString()} active
                {closedStats ? ` and ${closedStats.analyzed.toLocaleString()} closed` : ''} listings
                from KW Unified Listing Service · Updated nightly
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
