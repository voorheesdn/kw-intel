'use client';

import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ModuleType = 'competitor' | 'brokerage' | 'partnership' | 'market' | 'briefing';
type ImpactLevel = 'high' | 'medium' | 'low';

interface CompetitorData {
  competitor: string;
  summary: string;
  recentMoves: Array<{
    title: string;
    detail: string;
    impact: ImpactLevel;
    date: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  threatToKW: string;
  opportunityForKW: string;
  signalsToWatch: string[];
  materialityScore: number;
}

interface BrokerageData {
  brokerage: string;
  summary: string;
  agentCount: string;
  growthTrajectory: string;
  splitModel: string;
  techStack: string;
  recentMoves: Array<{
    title: string;
    detail: string;
    impact: ImpactLevel;
    date: string;
  }>;
  recruitingStrategy: string;
  agentValueProps: string[];
  weaknesses: string[];
  threatToKW: string;
  opportunityForKW: string;
  signalsToWatch: string[];
  materialityScore: number;
}

interface PartnershipData {
  category: string;
  opportunities: Array<{
    company: string;
    product: string;
    description: string;
    agentValueProp: string;
    integrationComplexity: ImpactLevel;
    competitorAdoption: string;
    recommendation: 'pursue' | 'monitor' | 'pass';
    rationale: string;
  }>;
  marketContext: string;
  urgency: ImpactLevel;
  urgencyRationale: string;
}

interface MarketData {
  topic: string;
  executiveSummary: string;
  trends: Array<{
    trend: string;
    description: string;
    timeframe: 'now' | '6months' | '12months' | '24months';
    impact: ImpactLevel;
  }>;
  agentBehaviorSignals: string[];
  implicationsForKW: Array<{
    area: 'product' | 'integration' | 'competitive' | 'organizational';
    implication: string;
  }>;
  recommendedActions: Array<{
    action: string;
    owner: 'product' | 'integrations' | 'executive' | 'research';
    priority: 'immediate' | 'quarter' | 'halfyear';
  }>;
}

interface BriefingData {
  title: string;
  date: string;
  classification: string;
  executiveSummary: string;
  materialDevelopments: Array<{
    development: string;
    detail: string;
    source: string;
    materialityScore: number;
    recommendedResponse: string;
  }>;
  competitiveLandscape: string;
  partnershipPipeline: string;
  risksAndThreats: Array<{
    risk: string;
    detail: string;
    likelihood: ImpactLevel;
    impact: ImpactLevel;
  }>;
  recommendedAgenda: string[];
  nextBriefingFocus: string;
}

type IntelData = CompetitorData | PartnershipData | MarketData | BriefingData;

// ─── Constants ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<ModuleType, string> = {
  brokerage:
    "You are a competitive intelligence analyst specializing in real estate brokerage models. You work for Keller Williams' Agent Attraction and Product & Innovation teams. Your job is to profile competitor brokerages — focusing on their agent value proposition, growth trajectory, split and cap models, technology investments, and recruiting strategy as they compete with KW for agents. Respond ONLY with valid JSON (no markdown, no backticks, no preamble).",
  competitor:
    "You are a competitive intelligence analyst specializing in real estate technology. You work for Keller Williams' Product & Innovation team. Your job is to analyze a competitor and produce structured intelligence. You have deep knowledge of the real estate CRM and PropTech landscape. Respond ONLY with valid JSON (no markdown, no backticks, no preamble).",
  partnership:
    "You are a technology partnership scout for Keller Williams' Product & Innovation team. You evaluate PropTech companies and technology products for potential integration into the KW ecosystem (Command platform, Marketplace, or DevHub API). Respond ONLY with valid JSON.",
  market:
    "You are a real estate technology market analyst for Keller Williams' Product & Innovation team. You track macro trends, emerging technologies, agent behavior shifts, and market dynamics. Respond ONLY with valid JSON.",
  briefing:
    "You are the VP of Product & Innovation's intelligence briefing system at Keller Williams. You produce executive-ready intelligence briefings. Write in a voice that is direct, analytical, and confident — not hedging or academic. Respond ONLY with valid JSON.",
};

const MODULE_QUERIES: Record<ModuleType, (input: string) => string> = {
  brokerage: (input) =>
    `Profile "${input}" as a competitor brokerage to Keller Williams. Use web search to find current agent count, growth trajectory, split/cap model, technology stack, recruiting messaging, and recent strategic moves. Return structured JSON with this exact schema: {"brokerage": string, "summary": string, "agentCount": string, "growthTrajectory": string, "splitModel": string, "techStack": string, "recentMoves": [{"title": string, "detail": string, "impact": "high"|"medium"|"low", "date": string}], "recruitingStrategy": string, "agentValueProps": [string], "weaknesses": [string], "threatToKW": string, "opportunityForKW": string, "signalsToWatch": [string], "materialityScore": number}`,
  competitor: (input) =>
    `Analyze "${input}" as a competitor to Keller Williams in the real estate technology and CRM space. Use web search to find their latest product moves, pricing changes, funding rounds, partnerships, and agent adoption trends. Return structured JSON with this exact schema: {"competitor": string, "summary": string, "recentMoves": [{"title": string, "detail": string, "impact": "high"|"medium"|"low", "date": string}], "strengths": [string], "weaknesses": [string], "threatToKW": string, "opportunityForKW": string, "signalsToWatch": [string], "materialityScore": number}`,
  partnership: (input) =>
    `Scout integration and partnership opportunities in the "${input}" technology category for Keller Williams. Use web search to identify leading vendors, their products, market traction, and relevance to KW's Command platform, Marketplace, and agent ecosystem. Return JSON: {"category": string, "opportunities": [{"company": string, "product": string, "description": string, "agentValueProp": string, "integrationComplexity": "low"|"medium"|"high", "competitorAdoption": string, "recommendation": "pursue"|"monitor"|"pass", "rationale": string}], "marketContext": string, "urgency": "high"|"medium"|"low", "urgencyRationale": string}`,
  market: (input) =>
    `Analyze the "${input}" trend in real estate technology for Keller Williams' Product & Innovation team. Use web search for current data and market signals. Return JSON: {"topic": string, "executiveSummary": string, "trends": [{"trend": string, "description": string, "timeframe": "now"|"6months"|"12months"|"24months", "impact": "high"|"medium"|"low"}], "agentBehaviorSignals": [string], "implicationsForKW": [{"area": "product"|"integration"|"competitive"|"organizational", "implication": string}], "recommendedActions": [{"action": string, "owner": "product"|"integrations"|"executive"|"research", "priority": "immediate"|"quarter"|"halfyear"}]}`,
  briefing: (input) =>
    `Produce an executive intelligence briefing on "${input}" for the VP of Product & Innovation at Keller Williams. Use web search for current intelligence. Return JSON: {"title": string, "date": string, "classification": "KW Internal — Confidential", "executiveSummary": string, "materialDevelopments": [{"development": string, "detail": string, "source": string, "materialityScore": number, "recommendedResponse": string}], "competitiveLandscape": string, "partnershipPipeline": string, "risksAndThreats": [{"risk": string, "detail": string, "likelihood": "high"|"medium"|"low", "impact": "high"|"medium"|"low"}], "recommendedAgenda": [string], "nextBriefingFocus": string}`,
};

const QUICK_TARGETS: { label: string; group: string; module: ModuleType }[] = [
  { label: 'eXp Realty', group: 'Brokerages', module: 'brokerage' },
  { label: 'Compass', group: 'Brokerages', module: 'brokerage' },
  { label: 'REAL Broker', group: 'Brokerages', module: 'brokerage' },
  { label: 'Side', group: 'Brokerages', module: 'brokerage' },
  { label: 'Follow Up Boss', group: 'CRM / Tech', module: 'competitor' },
  { label: 'kvCORE / Inside Real Estate', group: 'CRM / Tech', module: 'competitor' },
  { label: 'Sierra Interactive', group: 'CRM / Tech', module: 'competitor' },
  { label: 'Lofty', group: 'CRM / Tech', module: 'competitor' },
  { label: 'Brivity', group: 'CRM / Tech', module: 'competitor' },
  { label: 'Cloze', group: 'CRM / Tech', module: 'competitor' },
  { label: 'Realvolve', group: 'CRM / Tech', module: 'competitor' },
  { label: 'Propertybase', group: 'CRM / Tech', module: 'competitor' },
  { label: 'Rechat', group: 'CRM / Tech', module: 'competitor' },
];

const MODULE_CONFIG: Record<ModuleType, { label: string; placeholder: string; description: string }> = {
  brokerage: {
    label: 'Brokerage Intel',
    placeholder: 'Enter brokerage name (e.g. eXp Realty)',
    description: 'Agent value prop, splits, tech stack & recruiting strategy',
  },
  competitor: {
    label: 'Competitor Intel',
    placeholder: 'Enter competitor name (e.g. Follow Up Boss)',
    description: 'Structured competitive profile with threat assessment',
  },
  partnership: {
    label: 'Partnership Scout',
    placeholder: 'Enter tech category (e.g. AI showing assistants)',
    description: 'Integration & partnership opportunity evaluation',
  },
  market: {
    label: 'Market Trends',
    placeholder: 'Enter trend topic (e.g. AI-powered lead scoring)',
    description: 'Market intelligence and implications for KW',
  },
  briefing: {
    label: 'Executive Briefing',
    placeholder: 'Enter briefing topic (e.g. Q2 competitive landscape)',
    description: 'C-suite ready intelligence synthesis',
  },
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function stripCitations(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/<cite[^>]*>([\s\S]*?)<\/cite>/g, '$1').trim();
  }
  if (Array.isArray(value)) {
    return value.map(stripCitations);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stripCitations(v)])
    );
  }
  return value;
}

function extractJSON(content: unknown[]): IntelData {
  const textBlocks = content
    .filter((b: unknown) => (b as { type: string }).type === 'text')
    .map((b: unknown) => ((b as { text: string }).text || '').trim());

  if (textBlocks.length === 0) {
    throw new Error('No text content in API response');
  }

  for (let i = textBlocks.length - 1; i >= 0; i--) {
    const text = textBlocks[i];
    try {
      return JSON.parse(text) as IntelData;
    } catch {
      const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        try { return JSON.parse(codeMatch[1]) as IntelData; } catch { /* continue */ }
      }
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { return JSON.parse(jsonMatch[0]) as IntelData; } catch { /* continue */ }
      }
    }
  }
  throw new Error('Model did not return valid JSON. Try running again.');
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconPuzzle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function IconTrendingUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="15" rx="1" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12.01" />
      <path d="M8 12h.01M16 12h.01M8 16h.01M16 16h.01M12 16h.01" />
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconLoader() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

const MODULE_ICONS: Record<ModuleType, () => React.ReactElement> = {
  brokerage: IconBuilding,
  competitor: IconShield,
  partnership: IconPuzzle,
  market: IconTrendingUp,
  briefing: IconFileText,
};

// ─── Badge Components ─────────────────────────────────────────────────────────

function ImpactBadge({ level }: { level: ImpactLevel }) {
  const styles: Record<ImpactLevel, string> = {
    high: 'bg-red-50 text-red-600 border border-red-200',
    medium: 'bg-amber-50 text-amber-600 border border-amber-200',
    low: 'bg-teal-50 text-teal-600 border border-teal-200',
  };
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded uppercase tracking-wide ${styles[level]}`}>
      {level}
    </span>
  );
}

function MaterialityMeter({ score }: { score: number }) {
  const pct = Math.min(Math.max(Number(score) || 0, 0), 10) * 10;
  const color = pct >= 70 ? '#E8453C' : pct >= 40 ? '#F4A261' : '#45B69C';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-xs text-gray-400 shrink-0">{score}/10</span>
    </div>
  );
}

function RecBadge({ rec }: { rec: 'pursue' | 'monitor' | 'pass' }) {
  const styles = {
    pursue: 'bg-blue-50 text-blue-600 border border-blue-200',
    monitor: 'bg-amber-50 text-amber-600 border border-amber-200',
    pass: 'bg-gray-100 text-gray-500 border border-gray-200',
  };
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded uppercase tracking-wide ${styles[rec]}`}>
      {rec}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: 'immediate' | 'quarter' | 'halfyear' }) {
  const styles = {
    immediate: 'bg-red-50 text-red-600 border border-red-200',
    quarter: 'bg-amber-50 text-amber-600 border border-amber-200',
    halfyear: 'bg-gray-100 text-gray-500 border border-gray-200',
  };
  const labels = { immediate: 'Immediate', quarter: 'This Quarter', halfyear: '6 Months' };
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded uppercase tracking-wide ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
}

function OwnerBadge({ owner }: { owner: string }) {
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide">
      {owner}
    </span>
  );
}

function AreaBadge({ area }: { area: string }) {
  const styles: Record<string, string> = {
    product: 'bg-blue-50 text-blue-600 border-blue-100',
    integration: 'bg-teal-50 text-teal-600 border-teal-100',
    competitive: 'bg-red-50 text-red-600 border-red-100',
    organizational: 'bg-purple-50 text-purple-600 border-purple-100',
  };
  const s = styles[area] || 'bg-gray-100 text-gray-500 border-gray-200';
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide shrink-0 ${s}`}>
      {area}
    </span>
  );
}

function TimeframeBadge({ timeframe }: { timeframe: string }) {
  const labels: Record<string, string> = {
    now: 'Now',
    '6months': '6 Mo',
    '12months': '12 Mo',
    '24months': '24 Mo',
  };
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 uppercase tracking-wide shrink-0">
      {labels[timeframe] || timeframe}
    </span>
  );
}

function ComplexityBadge({ complexity }: { complexity: ImpactLevel }) {
  const styles: Record<ImpactLevel, string> = {
    low: 'bg-teal-50 text-teal-600 border-teal-100',
    medium: 'bg-amber-50 text-amber-600 border-amber-100',
    high: 'bg-red-50 text-red-600 border-red-100',
  };
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${styles[complexity]}`}>
      {complexity} complexity
    </span>
  );
}

// ─── Layout Primitives ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-xs uppercase tracking-widest text-gray-400 mb-2.5">{children}</div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-100 shadow-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

function TagList({ items, variant = 'gray' }: { items: string[]; variant?: 'gray' | 'red' | 'teal' | 'blue' }) {
  const styles: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-50 text-red-700',
    teal: 'bg-teal-50 text-teal-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {(items || []).map((item, i) => (
        <span key={i} className={`text-xs px-2.5 py-1 rounded-md ${styles[variant]}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── Module Result Renderers ──────────────────────────────────────────────────

function CompetitorResult({ data }: { data: CompetitorData }) {
  const score = Number(data.materialityScore) || 0;
  const scoreColor = score >= 7 ? '#E8453C' : score >= 4 ? '#F4A261' : '#45B69C';
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{data.competitor}</h2>
          <p className="font-mono text-xs text-gray-400 mt-0.5 uppercase tracking-wider">Competitive Intelligence Report</p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xs text-gray-400 mb-1 uppercase tracking-wider">Materiality</div>
          <div className="text-3xl font-bold leading-none" style={{ color: scoreColor }}>
            {score}<span className="text-sm text-gray-400 font-normal">/10</span>
          </div>
          <div className="w-28 mt-2">
            <MaterialityMeter score={score} />
          </div>
        </div>
      </div>

      <Card>
        <SectionLabel>Summary</SectionLabel>
        <p className="text-sm text-gray-700 leading-relaxed">{data.summary}</p>
      </Card>

      {data.recentMoves?.length > 0 && (
        <div>
          <SectionLabel>Recent Moves</SectionLabel>
          <div className="space-y-2">
            {data.recentMoves.map((move, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 mb-1">{move.title}</div>
                    <p className="text-sm text-gray-600 leading-relaxed">{move.detail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <ImpactBadge level={move.impact} />
                    <span className="font-mono text-xs text-gray-400">{move.date}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <SectionLabel>Strengths</SectionLabel>
          <Card><TagList items={data.strengths || []} variant="teal" /></Card>
        </div>
        <div>
          <SectionLabel>Weaknesses</SectionLabel>
          <Card><TagList items={data.weaknesses || []} variant="red" /></Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-2 border-l-red-400">
          <SectionLabel>Threat to KW</SectionLabel>
          <p className="text-sm text-gray-700 leading-relaxed">{data.threatToKW}</p>
        </Card>
        <Card className="border-l-2 border-l-teal-400">
          <SectionLabel>Opportunity for KW</SectionLabel>
          <p className="text-sm text-gray-700 leading-relaxed">{data.opportunityForKW}</p>
        </Card>
      </div>

      {data.signalsToWatch?.length > 0 && (
        <div>
          <SectionLabel>Signals to Watch</SectionLabel>
          <Card>
            <ul className="space-y-2">
              {data.signalsToWatch.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-amber-400 mt-0.5 shrink-0">◆</span>
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function BrokerageResult({ data }: { data: BrokerageData }) {
  const score = Number(data.materialityScore) || 0;
  const scoreColor = score >= 7 ? '#E8453C' : score >= 4 ? '#F4A261' : '#45B69C';
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{data.brokerage}</h2>
          <p className="font-mono text-xs text-gray-400 mt-0.5 uppercase tracking-wider">Brokerage Intelligence Report</p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xs text-gray-400 mb-1 uppercase tracking-wider">Materiality</div>
          <div className="text-3xl font-bold leading-none" style={{ color: scoreColor }}>
            {score}<span className="text-sm text-gray-400 font-normal">/10</span>
          </div>
          <div className="w-28 mt-2">
            <MaterialityMeter score={score} />
          </div>
        </div>
      </div>

      <Card>
        <SectionLabel>Summary</SectionLabel>
        <p className="text-sm text-gray-700 leading-relaxed">{data.summary}</p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <SectionLabel>Agent Count</SectionLabel>
          <p className="text-lg font-semibold text-gray-900">{data.agentCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">{data.growthTrajectory}</p>
        </Card>
        <Card>
          <SectionLabel>Split / Cap Model</SectionLabel>
          <p className="text-sm text-gray-700">{data.splitModel}</p>
        </Card>
        <Card>
          <SectionLabel>Tech Stack</SectionLabel>
          <p className="text-sm text-gray-700">{data.techStack}</p>
        </Card>
      </div>

      <Card>
        <SectionLabel>Recruiting Strategy</SectionLabel>
        <p className="text-sm text-gray-700 leading-relaxed">{data.recruitingStrategy}</p>
      </Card>

      {data.recentMoves?.length > 0 && (
        <div>
          <SectionLabel>Recent Moves</SectionLabel>
          <div className="space-y-2">
            {data.recentMoves.map((move, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 mb-1">{move.title}</div>
                    <p className="text-sm text-gray-600 leading-relaxed">{move.detail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <ImpactBadge level={move.impact} />
                    <span className="font-mono text-xs text-gray-400">{move.date}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <SectionLabel>Agent Value Props</SectionLabel>
          <Card><TagList items={data.agentValueProps || []} variant="teal" /></Card>
        </div>
        <div>
          <SectionLabel>Weaknesses</SectionLabel>
          <Card><TagList items={data.weaknesses || []} variant="red" /></Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-2 border-l-red-400">
          <SectionLabel>Threat to KW</SectionLabel>
          <p className="text-sm text-gray-700 leading-relaxed">{data.threatToKW}</p>
        </Card>
        <Card className="border-l-2 border-l-teal-400">
          <SectionLabel>Opportunity for KW</SectionLabel>
          <p className="text-sm text-gray-700 leading-relaxed">{data.opportunityForKW}</p>
        </Card>
      </div>

      {data.signalsToWatch?.length > 0 && (
        <div>
          <SectionLabel>Signals to Watch</SectionLabel>
          <Card>
            <ul className="space-y-2">
              {data.signalsToWatch.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-amber-400 mt-0.5 shrink-0">◆</span>
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function PartnershipResult({ data }: { data: PartnershipData }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{data.category}</h2>
          <p className="font-mono text-xs text-gray-400 mt-0.5 uppercase tracking-wider">Partnership & Integration Scout</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-mono text-xs text-gray-400 uppercase tracking-wider">Urgency</span>
          <ImpactBadge level={data.urgency} />
        </div>
      </div>

      <Card>
        <SectionLabel>Market Context</SectionLabel>
        <p className="text-sm text-gray-700 leading-relaxed mb-2">{data.marketContext}</p>
        <p className="text-sm text-gray-500 italic">{data.urgencyRationale}</p>
      </Card>

      {data.opportunities?.length > 0 && (
        <div>
          <SectionLabel>Opportunities ({data.opportunities.length})</SectionLabel>
          <div className="space-y-3">
            {data.opportunities.map((opp, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{opp.company}</div>
                    <div className="font-mono text-xs text-gray-400 mt-0.5">{opp.product}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <RecBadge rec={opp.recommendation} />
                    <ComplexityBadge complexity={opp.integrationComplexity} />
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2.5">{opp.description}</p>
                <div className="bg-blue-50 rounded-md p-2.5 mb-2.5">
                  <div className="font-mono text-xs text-blue-400 uppercase tracking-wider mb-0.5">Agent Value</div>
                  <p className="text-sm text-blue-800">{opp.agentValueProp}</p>
                </div>
                {opp.competitorAdoption && (
                  <p className="font-mono text-xs text-gray-400 mb-2">Competitor adoption: {opp.competitorAdoption}</p>
                )}
                <p className="text-sm text-gray-500 italic">{opp.rationale}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MarketResult({ data }: { data: MarketData }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{data.topic}</h2>
        <p className="font-mono text-xs text-gray-400 mt-0.5 uppercase tracking-wider">Market Intelligence Report</p>
      </div>

      <Card>
        <SectionLabel>Executive Summary</SectionLabel>
        <p className="text-sm text-gray-700 leading-relaxed">{data.executiveSummary}</p>
      </Card>

      {data.trends?.length > 0 && (
        <div>
          <SectionLabel>Trends</SectionLabel>
          <div className="space-y-2">
            {data.trends.map((t, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-1.5">
                  <div className="font-semibold text-sm text-gray-900">{t.trend}</div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TimeframeBadge timeframe={t.timeframe} />
                    <ImpactBadge level={t.impact} />
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{t.description}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.agentBehaviorSignals?.length > 0 && (
        <div>
          <SectionLabel>Agent Behavior Signals</SectionLabel>
          <Card>
            <ul className="space-y-2">
              {data.agentBehaviorSignals.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-400 mt-0.5 shrink-0">→</span>
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {data.implicationsForKW?.length > 0 && (
        <div>
          <SectionLabel>Implications for KW</SectionLabel>
          <div className="space-y-2">
            {data.implicationsForKW.map((impl, i) => (
              <Card key={i}>
                <div className="flex items-start gap-3">
                  <AreaBadge area={impl.area} />
                  <p className="text-sm text-gray-700 flex-1">{impl.implication}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.recommendedActions?.length > 0 && (
        <div>
          <SectionLabel>Recommended Actions</SectionLabel>
          <div className="space-y-2">
            {data.recommendedActions.map((action, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-gray-800 flex-1">{action.action}</p>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <PriorityBadge priority={action.priority} />
                    <OwnerBadge owner={action.owner} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BriefingResult({ data }: { data: BriefingData }) {
  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-gray-200">
        <div className="font-mono text-xs text-red-500 uppercase tracking-widest mb-1">{data.classification}</div>
        <h2 className="text-2xl font-semibold text-gray-900">{data.title}</h2>
        <p className="font-mono text-xs text-gray-400 mt-0.5">{data.date}</p>
      </div>

      <Card className="border-l-2 border-l-blue-400">
        <SectionLabel>Executive Summary</SectionLabel>
        <p className="text-sm text-gray-700 leading-relaxed">{data.executiveSummary}</p>
      </Card>

      {data.materialDevelopments?.length > 0 && (
        <div>
          <SectionLabel>Material Developments</SectionLabel>
          <div className="space-y-3">
            {data.materialDevelopments.map((dev, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="font-semibold text-sm text-gray-900 flex-1">{dev.development}</div>
                  <div className="shrink-0 w-28">
                    <div className="font-mono text-xs text-gray-400 mb-1 text-right">Materiality</div>
                    <MaterialityMeter score={dev.materialityScore} />
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{dev.detail}</p>
                {dev.source && (
                  <p className="font-mono text-xs text-gray-400 mb-2">Source: {dev.source}</p>
                )}
                <div className="bg-amber-50 rounded-md p-2.5">
                  <div className="font-mono text-xs text-amber-500 uppercase tracking-wider mb-0.5">Recommended Response</div>
                  <p className="text-sm text-amber-900">{dev.recommendedResponse}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <SectionLabel>Competitive Landscape</SectionLabel>
          <p className="text-sm text-gray-700 leading-relaxed">{data.competitiveLandscape}</p>
        </Card>
        <Card>
          <SectionLabel>Partnership Pipeline</SectionLabel>
          <p className="text-sm text-gray-700 leading-relaxed">{data.partnershipPipeline}</p>
        </Card>
      </div>

      {data.risksAndThreats?.length > 0 && (
        <div>
          <SectionLabel>Risks & Threats</SectionLabel>
          <div className="space-y-2">
            {data.risksAndThreats.map((risk, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="font-semibold text-sm text-gray-900">{risk.risk}</div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-xs text-gray-400">L:</span>
                    <ImpactBadge level={risk.likelihood} />
                    <span className="font-mono text-xs text-gray-400">I:</span>
                    <ImpactBadge level={risk.impact} />
                  </div>
                </div>
                <p className="text-sm text-gray-600">{risk.detail}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.recommendedAgenda?.length > 0 && (
        <div>
          <SectionLabel>Recommended Agenda</SectionLabel>
          <Card>
            <ol className="space-y-2">
              {data.recommendedAgenda.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="font-mono text-xs text-gray-400 mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  {item}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      {data.nextBriefingFocus && (
        <Card className="bg-gray-50">
          <SectionLabel>Next Briefing Focus</SectionLabel>
          <p className="text-sm text-gray-600">{data.nextBriefingFocus}</p>
        </Card>
      )}
    </div>
  );
}

// ─── Loading & Empty States ───────────────────────────────────────────────────

function LoadingState({ module: mod }: { module: ModuleType }) {
  const labels: Record<ModuleType, string> = {
    brokerage: 'Profiling brokerage',
    competitor: 'Profiling competitor',
    partnership: 'Scouting partnerships',
    market: 'Analyzing market trends',
    briefing: 'Compiling briefing',
  };
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="text-[#2D7DD2]"><IconLoader /></div>
      <p className="font-mono text-sm text-gray-500">{labels[mod]}...</p>
      <p className="font-mono text-xs text-gray-400">Searching the web · Synthesizing intelligence</p>
    </div>
  );
}

function EmptyState({ module: mod }: { module: ModuleType }) {
  const Icon = MODULE_ICONS[mod];
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
        <Icon />
      </div>
      <p className="font-semibold text-gray-600">{MODULE_CONFIG[mod].label}</p>
      <p className="text-sm text-gray-400 max-w-xs">{MODULE_CONFIG[mod].description}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MODULES: ModuleType[] = ['brokerage', 'competitor', 'partnership', 'market', 'briefing'];

export default function Page() {
  const [activeModule, setActiveModule] = useState<ModuleType>('competitor');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultModule, setResultModule] = useState<ModuleType>('competitor');

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: SYSTEM_PROMPTS[queryModule],
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: MODULE_QUERIES[queryModule](queryInput) }],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || `API error ${res.status}`);
      }
      if (!data.content || !Array.isArray(data.content)) {
        throw new Error('Unexpected API response format');
      }

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

  const renderResult = () => {
    if (!result) return null;
    switch (resultModule) {
      case 'brokerage': return <BrokerageResult data={result as unknown as BrokerageData} />;
      case 'competitor': return <CompetitorResult data={result as CompetitorData} />;
      case 'partnership': return <PartnershipResult data={result as PartnershipData} />;
      case 'market': return <MarketResult data={result as MarketData} />;
      case 'briefing': return <BriefingResult data={result as BriefingData} />;
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
        </div>

        {/* Module Nav */}
        <nav className="px-3 py-4">
          <div className="font-mono text-xs text-white/30 uppercase tracking-widest px-2 mb-2">Modules</div>
          {MODULES.map((mod) => {
            const Icon = MODULE_ICONS[mod];
            const active = activeModule === mod;
            return (
              <button
                key={mod}
                onClick={() => handleModuleChange(mod)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-left transition-colors ${
                  active
                    ? 'bg-[#E8453C] text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white/90'
                }`}
              >
                <Icon />
                <span className="text-sm font-medium">{MODULE_CONFIG[mod].label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Targets */}
        <div className="px-3 py-2 border-t border-white/10">
          <div className="font-mono text-xs text-white/30 uppercase tracking-widest px-2 mb-2">Quick Targets</div>
          {(['Brokerages', 'CRM / Tech'] as const).map((group) => (
            <div key={group} className="mb-1">
              <div className="font-mono text-xs text-white/20 uppercase tracking-widest px-2 py-1">{group}</div>
              {QUICK_TARGETS.filter((t) => t.group === group).map((target) => (
                <button
                  key={target.label}
                  onClick={() => handleQuickTarget(target.label, target.module)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors group"
                >
                  <span className="text-white/20 group-hover:text-white/40 shrink-0">
                    <IconTarget />
                  </span>
                  <span className="text-xs truncate flex-1">{target.label}</span>
                  <span className="text-white/20 group-hover:text-white/40 shrink-0">
                    <IconChevronRight />
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Input Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
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
              {loading ? 'Running…' : 'Run Intel'}
            </button>
          </div>
          <p className="font-mono text-xs text-gray-400 mt-2">
            {MODULE_CONFIG[activeModule].description}
            <span className="mx-1.5">·</span>claude-sonnet-4-20250514
            <span className="mx-1.5">·</span>Web search enabled
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-mono text-xs text-red-400 uppercase tracking-wider mb-1">Error</div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {loading && <LoadingState module={activeModule} />}
          {!loading && !result && !error && <EmptyState module={activeModule} />}
          {!loading && result && renderResult()}
        </div>
      </main>
    </div>
  );
}
