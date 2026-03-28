'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { FRED_SERIES, FRED_CATEGORIES, formatFredValue, computeChange } from '@/lib/fred';
import type { FredSeries, FredObservation } from '@/lib/fred';
import { IconSearch, IconBarChart, IconLoader, IconHome } from '@/components/ui/Icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeriesData {
  seriesId: string;
  observations: FredObservation[];
}

type TimeRange = '1Y' | '3Y' | '5Y';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterByRange(obs: FredObservation[], range: TimeRange): FredObservation[] {
  const now = new Date();
  const years = range === '1Y' ? 1 : range === '3Y' ? 3 : 5;
  const cutoff = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
  return obs
    .filter(o => o.value !== '.' && new Date(o.date) >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function buildChartData(
  seriesMap: Map<string, FredObservation[]>,
  seriesIds: string[],
  range: TimeRange,
): Array<Record<string, string | number>> {
  const allDates = new Set<string>();
  const filtered: Record<string, FredObservation[]> = {};

  for (const id of seriesIds) {
    const obs = seriesMap.get(id) || [];
    filtered[id] = filterByRange(obs, range);
    filtered[id].forEach(o => allDates.add(o.date));
  }

  const sortedDates = Array.from(allDates).sort();
  return sortedDates.map(date => {
    const row: Record<string, string | number> = { date };
    for (const id of seriesIds) {
      const obs = filtered[id].find(o => o.date === date);
      if (obs) row[id] = parseFloat(obs.value);
    }
    return row;
  });
}

function formatDateTick(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const CHART_COLORS = {
  red: '#E8453C',
  blue: '#2D7DD2',
  teal: '#45B69C',
  amber: '#F4A261',
};

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ series, data }: { series: FredSeries; data: FredObservation[] | undefined }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
        <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">{series.shortLabel}</div>
        <div className="text-gray-300 text-lg">Loading...</div>
      </div>
    );
  }

  const valid = data.filter(o => o.value !== '.');
  const current = valid[0];
  const change = computeChange(valid);

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
      <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1 truncate" title={series.label}>
        {series.shortLabel}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {formatFredValue(current.value, series)}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {change && (
          <>
            <span className={`text-sm font-medium ${change.direction === 'up' ? 'text-red-500' : change.direction === 'down' ? 'text-teal-500' : 'text-gray-400'}`}>
              {change.direction === 'up' ? '\u25B2' : change.direction === 'down' ? '\u25BC' : '\u2014'}
              {' '}{Math.abs(change.change).toFixed(1)}%
            </span>
          </>
        )}
        <span className="font-mono text-xs text-gray-400">
          {new Date(current.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// ─── Range Toggle ─────────────────────────────────────────────────────────────

function RangeToggle({ value, onChange }: { value: TimeRange; onChange: (r: TimeRange) => void }) {
  const ranges: TimeRange[] = ['1Y', '3Y', '5Y'];
  return (
    <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
      {ranges.map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
            value === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────

function ChartCard({
  title,
  seriesIds,
  seriesMap,
  range,
  onRangeChange,
  colors,
}: {
  title: string;
  seriesIds: string[];
  seriesMap: Map<string, FredObservation[]>;
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  colors: string[];
}) {
  const chartData = buildChartData(seriesMap, seriesIds, range);
  const labels = seriesIds.map(id => FRED_SERIES.find(s => s.id === id)?.shortLabel || id);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <div className="font-semibold text-sm text-gray-900">{title}</div>
          <RangeToggle value={range} onChange={onRangeChange} />
        </div>
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading chart data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="font-semibold text-sm text-gray-900">{title}</div>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            tick={{ fontSize: 11, fill: '#999' }}
            axisLine={{ stroke: '#e5e5e5' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#999' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e5e5', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            labelFormatter={(label) => new Date(label as string).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          {seriesIds.map((id, i) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              name={labels[i]}
              stroke={colors[i]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const [seriesMap, setSeriesMap] = useState<Map<string, FredObservation[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>('1Y');


  const fetchAllSeries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = FRED_SERIES.map(s => s.id).join(',');
      const res = await fetch(`/api/market/fred?series=${ids}&limit=60`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch FRED data');

      const map = new Map<string, FredObservation[]>();
      for (const item of json.data || []) {
        map.set(item.seriesId, item.observations || []);
      }
      setSeriesMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllSeries(); }, [fetchAllSeries]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar (same as workbench) ── */}
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
            <a href="/market" className="text-white/90 text-xs font-medium hover:text-white flex items-center gap-1">
              <IconBarChart /> Market Data
            </a>
            <a href="/listings" className="text-white/40 text-xs font-medium hover:text-white/80 flex items-center gap-1">
              <IconHome /> Listings
            </a>
          </div>
        </div>

        {/* Series Index */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="font-mono text-xs text-white/30 uppercase tracking-widest px-2 mb-3">Real Estate</div>
          {FRED_CATEGORIES.filter(c => ['mortgage', 'prices', 'supply', 'affordability'].includes(c.key)).map(cat => (
            <div key={cat.key} className="mb-3">
              <div className="font-mono text-xs text-white/20 uppercase tracking-widest px-2 py-1">{cat.label}</div>
              {FRED_SERIES.filter(s => s.category === cat.key).map(s => {
                const obs = seriesMap.get(s.id);
                const latest = obs?.find(o => o.value !== '.');
                return (
                  <div key={s.id} className="flex items-center justify-between px-2 py-1.5 rounded text-white/50 hover:bg-white/5 transition-colors">
                    <span className="text-xs truncate flex-1">{s.shortLabel}</span>
                    <span className="font-mono text-xs text-white/70 shrink-0">
                      {latest ? formatFredValue(latest.value, s) : '\u2014'}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="font-mono text-xs text-white/30 uppercase tracking-widest px-2 mb-3 mt-4 pt-3 border-t border-white/10">Economic</div>
          {FRED_CATEGORIES.filter(c => c.key === 'economic').map(cat => (
            <div key={cat.key} className="mb-3">
              {FRED_SERIES.filter(s => s.category === cat.key).map(s => {
                const obs = seriesMap.get(s.id);
                const latest = obs?.find(o => o.value !== '.');
                return (
                  <div key={s.id} className="flex items-center justify-between px-2 py-1.5 rounded text-white/50 hover:bg-white/5 transition-colors">
                    <span className="text-xs truncate flex-1">{s.shortLabel}</span>
                    <span className="font-mono text-xs text-white/70 shrink-0">
                      {latest ? formatFredValue(latest.value, s) : '\u2014'}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Market Data Dashboard</h1>
              <p className="font-mono text-xs text-gray-400 mt-0.5">
                Federal Reserve Economic Data (FRED) &middot; {FRED_SERIES.length} series &middot; Auto-refreshed hourly
              </p>
            </div>
            <button
              onClick={fetchAllSeries}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-mono rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-mono text-xs text-red-400 uppercase tracking-wider mb-1">Error</div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading && seriesMap.size === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="text-[#2D7DD2]"><IconLoader /></div>
              <p className="font-mono text-sm text-gray-500">Loading market data...</p>
              <p className="font-mono text-xs text-gray-400">Fetching {FRED_SERIES.length} series from FRED</p>
            </div>
          )}

          {seriesMap.size > 0 && (
            <>
              {/* ═══ REAL ESTATE MARKET ═══ */}
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-5 bg-[#E8453C] rounded-full" />
                  <h2 className="text-lg font-semibold text-gray-900">Real Estate Market</h2>
                </div>

                {/* RE Metric Cards */}
                {FRED_CATEGORIES.filter(c => ['mortgage', 'prices', 'supply', 'affordability'].includes(c.key)).map(cat => {
                  const series = FRED_SERIES.filter(s => s.category === cat.key);
                  return (
                    <div key={cat.key} className="mb-6">
                      <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-3">{cat.label}</div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {series.map(s => (
                          <MetricCard key={s.id} series={s} data={seriesMap.get(s.id)} />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* RE Charts */}
                <div className="mt-6 space-y-6">
                  <div className="font-mono text-xs text-gray-400 uppercase tracking-widest">Real Estate Trends</div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <ChartCard
                      title="Mortgage Rates"
                      seriesIds={['MORTGAGE30US', 'MORTGAGE15US']}
                      seriesMap={seriesMap}
                      range={range}
                      onRangeChange={setRange}
                      colors={[CHART_COLORS.red, CHART_COLORS.amber]}
                    />
                    <ChartCard
                      title="Home Prices (Case-Shiller Index)"
                      seriesIds={['CSUSHPINSA']}
                      seriesMap={seriesMap}
                      range={range}
                      onRangeChange={setRange}
                      colors={[CHART_COLORS.blue]}
                    />
                    <ChartCard
                      title="Housing Supply"
                      seriesIds={['ACTLISCOUUS', 'MSACSR']}
                      seriesMap={seriesMap}
                      range={range}
                      onRangeChange={setRange}
                      colors={[CHART_COLORS.teal, CHART_COLORS.amber]}
                    />
                    <ChartCard
                      title="Affordability"
                      seriesIds={['MDSP', 'TDSP']}
                      seriesMap={seriesMap}
                      range={range}
                      onRangeChange={setRange}
                      colors={[CHART_COLORS.red, CHART_COLORS.blue]}
                    />
                  </div>
                </div>
              </div>

              {/* ═══ ECONOMIC CONTEXT ═══ */}
              <div className="mb-10 pt-8 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-5 bg-[#2D7DD2] rounded-full" />
                  <h2 className="text-lg font-semibold text-gray-900">Economic Context</h2>
                </div>

                {/* Economic Metric Cards */}
                {(() => {
                  const series = FRED_SERIES.filter(s => s.category === 'economic');
                  return (
                    <div className="mb-6">
                      <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-3">Macro Indicators</div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {series.map(s => (
                          <MetricCard key={s.id} series={s} data={seriesMap.get(s.id)} />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Economic Charts */}
                <div className="mt-6 space-y-6">
                  <div className="font-mono text-xs text-gray-400 uppercase tracking-widest">Economic Trends</div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <ChartCard
                      title="Fed Funds Rate & Unemployment"
                      seriesIds={['FEDFUNDS', 'UNRATE']}
                      seriesMap={seriesMap}
                      range={range}
                      onRangeChange={setRange}
                      colors={[CHART_COLORS.red, CHART_COLORS.blue]}
                    />
                    <ChartCard
                      title="Consumer Sentiment"
                      seriesIds={['UMCSENT']}
                      seriesMap={seriesMap}
                      range={range}
                      onRangeChange={setRange}
                      colors={[CHART_COLORS.teal]}
                    />
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      </main>
    </div>
  );
}
