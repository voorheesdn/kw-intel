'use client';

import { useState } from 'react';
import type {
  ModuleType, IntelData, SmartData, CompetitorData, BrokerageData,
  PartnershipData, MarketData, BriefingData, SentimentData, FundingData,
} from '@/lib/types';
import { SYSTEM_PROMPTS, MODULE_QUERIES, MODULE_CONFIG, MODULES, QUICK_TARGETS, QUICK_TARGET_GROUPS } from '@/lib/constants';
import { stripCitations, extractJSON } from '@/lib/utils';
import { MODULE_ICONS, IconTarget, IconChevronRight, IconLoader, IconPrinter, IconCopy, IconSearch, IconBarChart } from '@/components/ui/Icons';
import {
  SmartResult, CompetitorResult, BrokerageResult, PartnershipResult,
  MarketResult, BriefingResult, SentimentResult, FundingResult,
} from '@/components/results';

export default function Page() {
  const [activeModule, setActiveModule] = useState<ModuleType>('smart');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultModule, setResultModule] = useState<ModuleType>('smart');
  const [copied, setCopied] = useState(false);

  const runIntel = async (overrideInput?: string, overrideModule?: ModuleType) => {
    const queryInput = (overrideInput ?? input).trim();
    const queryModule = overrideModule ?? activeModule;
    if (!queryInput) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setResultModule(queryModule);

    try {
      const res = await fetch('/api/intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 2000,
          system: SYSTEM_PROMPTS[queryModule],
          messages: [{ role: 'user', content: MODULE_QUERIES[queryModule](queryInput) }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`);
      if (!data.content || !Array.isArray(data.content)) throw new Error('Unexpected API response format');
      setResult(stripCitations(extractJSON(data.content)) as IntelData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTarget = (label: string, module: ModuleType) => {
    setActiveModule(module);
    setInput(label);
    runIntel(label, module);
  };

  const handleModuleChange = (mod: ModuleType) => {
    setActiveModule(mod);
    setInput('');
    setResult(null);
    setError(null);
  };

  const copyToClipboard = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(
        `KW Market Intelligence \u2014 ${MODULE_CONFIG[resultModule].label}\n` +
        `Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n` +
        `KW Product & Innovation \u2014 Confidential\n\n` +
        formatResultAsText(result, resultModule)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  const renderResult = () => {
    if (!result) return null;
    switch (resultModule) {
      case 'smart': return <SmartResult data={result as unknown as SmartData} />;
      case 'competitor': return <CompetitorResult data={result as unknown as CompetitorData} />;
      case 'brokerage': return <BrokerageResult data={result as unknown as BrokerageData} />;
      case 'partnership': return <PartnershipResult data={result as unknown as PartnershipData} />;
      case 'market': return <MarketResult data={result as unknown as MarketData} />;
      case 'briefing': return <BriefingResult data={result as unknown as BriefingData} />;
      case 'sentiment': return <SentimentResult data={result as unknown as SentimentData} />;
      case 'funding': return <FundingResult data={result as unknown as FundingData} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-[#1A1A1A] flex flex-col shrink-0 overflow-y-auto">
        {/* Logo */}
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
            <a href="/" className="text-white/90 text-xs font-medium hover:text-white flex items-center gap-1">
              <IconSearch /> Workbench
            </a>
            <a href="/market" className="text-white/40 text-xs font-medium hover:text-white/80 flex items-center gap-1">
              <IconBarChart /> Market Data
            </a>
          </div>
        </div>

        {/* Module Nav */}
        <nav className="px-3 py-4">
          <button
            onClick={() => handleModuleChange('smart')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 text-left transition-colors ${
              activeModule === 'smart'
                ? 'bg-[#E8453C] text-white'
                : 'bg-white/5 text-white/80 hover:bg-white/10'
            }`}
          >
            <MODULE_ICONS.smart />
            <div>
              <span className="text-sm font-semibold">Smart Query</span>
              <div className={`text-xs mt-0.5 ${activeModule === 'smart' ? 'text-white/70' : 'text-white/40'}`}>Ask anything</div>
            </div>
          </button>

          <div className="font-mono text-xs text-white/30 uppercase tracking-widest px-2 mt-3 mb-2">Focused Modules</div>
          {MODULES.filter(m => m !== 'smart').map((mod) => {
            const Icon = MODULE_ICONS[mod];
            const active = activeModule === mod;
            return (
              <button
                key={mod}
                onClick={() => handleModuleChange(mod)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-left transition-colors ${
                  active ? 'bg-[#E8453C] text-white' : 'text-white/60 hover:bg-white/10 hover:text-white/90'
                }`}
              >
                <Icon />
                <span className="text-sm">{MODULE_CONFIG[mod].label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Targets */}
        <div className="px-3 py-2 border-t border-white/10 flex-1 overflow-y-auto">
          <div className="font-mono text-xs text-white/30 uppercase tracking-widest px-2 mb-2">Quick Targets</div>
          {QUICK_TARGET_GROUPS.map((group) => (
            <div key={group} className="mb-1.5">
              <div className="font-mono text-xs text-white/20 uppercase tracking-widest px-2 py-1">{group}</div>
              {QUICK_TARGETS.filter((t) => t.group === group).map((target) => (
                <button
                  key={target.label}
                  onClick={() => handleQuickTarget(target.label, target.module)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors group"
                >
                  <span className="text-white/20 group-hover:text-white/40 shrink-0"><IconTarget /></span>
                  <span className="text-xs truncate flex-1">{target.label}</span>
                  <span className="text-white/20 group-hover:text-white/40 shrink-0"><IconChevronRight /></span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Input Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && runIntel()}
              placeholder={MODULE_CONFIG[activeModule].placeholder}
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D7DD2] focus:border-transparent transition-all"
            />
            <button
              onClick={() => runIntel()}
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 bg-[#E8453C] text-white text-sm font-semibold rounded-lg hover:bg-[#d0382f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {loading ? 'Running\u2026' : 'Run Intel'}
            </button>
          </div>
          <p className="font-mono text-xs text-gray-400 mt-2">
            {MODULE_CONFIG[activeModule].description}
            <span className="mx-1.5">&middot;</span>sonar-pro
            <span className="mx-1.5">&middot;</span>Real-time web search
          </p>
        </div>

        {/* Results */}
        <div className="print-scroll flex-1 overflow-y-auto px-6 py-6 print-content">
          {result && (
            <div className="print-header hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#E8453C] flex items-center justify-center">
                    <span className="text-white font-bold text-xs">KW</span>
                  </div>
                  <span className="font-semibold text-sm text-gray-900">KW Market Intelligence Platform</span>
                </div>
                <span className="font-mono text-xs text-gray-400">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  {' \u00b7 KW Internal \u2014 Confidential'}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="no-print mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-mono text-xs text-red-400 uppercase tracking-wider mb-1">Error</div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="text-[#2D7DD2]"><IconLoader /></div>
              <p className="font-mono text-sm text-gray-500">Running intelligence query...</p>
              <p className="font-mono text-xs text-gray-400">Searching the web &middot; Synthesizing intelligence</p>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                {(() => { const Icon = MODULE_ICONS[activeModule]; return <Icon />; })()}
              </div>
              <p className="font-semibold text-gray-600">{MODULE_CONFIG[activeModule].label}</p>
              <p className="text-sm text-gray-400 max-w-xs">{MODULE_CONFIG[activeModule].description}</p>
            </div>
          )}

          {!loading && result && (
            <>
              <div className="no-print flex justify-end gap-2 mb-4">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  <IconCopy />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  <IconPrinter />
                  Export PDF
                </button>
              </div>
              {renderResult()}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Clipboard Text Formatter ─────────────────────────────────────────────────

function formatResultAsText(data: IntelData, _module: ModuleType): string {
  const r = data as unknown as Record<string, unknown>;
  const lines: string[] = [];

  const title = (r.title || r.competitor || r.brokerage || r.category || r.topic || r.product || 'Intelligence Report') as string;
  lines.push(title);
  lines.push('='.repeat(title.length));
  lines.push('');

  const addText = (label: string, val: unknown) => {
    if (val && typeof val === 'string') lines.push(`${label}\n${val}\n`);
  };

  const addList = (label: string, items: unknown) => {
    if (!Array.isArray(items) || !items.length) return;
    lines.push(label);
    items.forEach((item) => {
      if (typeof item === 'string') { lines.push(`  \u2022 ${item}`); return; }
      if (typeof item === 'object' && item !== null) {
        const o = item as Record<string, unknown>;
        const t = (o.finding || o.title || o.trend || o.development || o.company || o.risk || o.theme || o.action || o.competitor || '') as string;
        const d = (o.detail || o.description || o.implication || o.rationale || o.comparison || '') as string;
        lines.push(`  \u2022 ${t}${d ? ' \u2014 ' + d : ''}`);
      }
    });
    lines.push('');
  };

  addText('EXECUTIVE SUMMARY', r.executiveSummary || r.summary);
  addText('BOTTOM LINE', r.bottomLine);
  addList('KEY FINDINGS', r.findings);
  addList('RECENT MOVES', r.recentMoves);
  addList('OPPORTUNITIES', r.opportunities);
  addList('TRENDS', r.trends);
  addList('THEMES', r.themes);
  addList('RECENT ACTIVITY', r.recentActivity);
  addList('MATERIAL DEVELOPMENTS', r.materialDevelopments);
  addList('IMPLICATIONS', r.implications);
  addList('IMPLICATIONS FOR KW', r.implicationsForKW);
  addList('RISKS & THREATS', r.risksAndThreats);
  addList('RECOMMENDED ACTIONS', r.recommendedActions);
  addList('SIGNALS TO WATCH', r.signalsToWatch);
  addList('AGENT PAIN POINTS', r.agentPainPoints);
  addList('FEATURE REQUESTS', r.featureRequests);
  addList('COMPANIES TO WATCH', r.companiesToWatch);
  addList('STRENGTHS', r.strengths);
  addList('WEAKNESSES', r.weaknesses);
  addText('THREAT TO KW', r.threatToKW);
  addText('OPPORTUNITY FOR KW', r.opportunityForKW);
  addText('TREND ANALYSIS', r.trendAnalysis);
  addText('RECRUITING STRATEGY', r.recruitingStrategy);

  return lines.join('\n');
}
