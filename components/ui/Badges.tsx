import type { ImpactLevel } from '@/lib/types';

export function ImpactBadge({ level }: { level: ImpactLevel }) {
  const s: Record<ImpactLevel, string> = {
    high: 'bg-red-50 text-red-600 border-red-200',
    medium: 'bg-amber-50 text-amber-600 border-amber-200',
    low: 'bg-teal-50 text-teal-600 border-teal-200',
  };
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${s[level]}`}>
      {level}
    </span>
  );
}

export function MaterialityMeter({ score }: { score: number }) {
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

export function RecBadge({ rec }: { rec: 'pursue' | 'monitor' | 'pass' }) {
  const s = {
    pursue: 'bg-blue-50 text-blue-600 border-blue-200',
    monitor: 'bg-amber-50 text-amber-600 border-amber-200',
    pass: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${s[rec]}`}>{rec}</span>;
}

export function PriorityBadge({ priority }: { priority: 'immediate' | 'quarter' | 'halfyear' }) {
  const s = {
    immediate: 'bg-red-50 text-red-600 border-red-200',
    quarter: 'bg-amber-50 text-amber-600 border-amber-200',
    halfyear: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const l = { immediate: 'Immediate', quarter: 'This Quarter', halfyear: '6 Months' };
  return <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${s[priority]}`}>{l[priority]}</span>;
}

export function UrgencyBadge({ urgency }: { urgency: 'immediate' | 'quarter' | 'halfyear' | 'monitor' }) {
  const s = {
    immediate: 'bg-red-50 text-red-600 border-red-200',
    quarter: 'bg-amber-50 text-amber-600 border-amber-200',
    halfyear: 'bg-gray-100 text-gray-500 border-gray-200',
    monitor: 'bg-blue-50 text-blue-600 border-blue-200',
  };
  const l = { immediate: 'Immediate', quarter: 'This Quarter', halfyear: '6 Months', monitor: 'Monitor' };
  return <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${s[urgency]}`}>{l[urgency]}</span>;
}

export function OwnerBadge({ owner }: { owner: string }) {
  return <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide">{owner}</span>;
}

export function AreaBadge({ area }: { area: string }) {
  const s: Record<string, string> = {
    product: 'bg-blue-50 text-blue-600 border-blue-100',
    integration: 'bg-teal-50 text-teal-600 border-teal-100',
    competitive: 'bg-red-50 text-red-600 border-red-100',
    organizational: 'bg-purple-50 text-purple-600 border-purple-100',
  };
  return <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide shrink-0 ${s[area] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{area}</span>;
}

export function TimeframeBadge({ timeframe }: { timeframe: string }) {
  const l: Record<string, string> = { now: 'Now', '6months': '6 Mo', '12months': '12 Mo', '24months': '24 Mo' };
  return <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 uppercase tracking-wide shrink-0">{l[timeframe] || timeframe}</span>;
}

export function ComplexityBadge({ complexity }: { complexity: ImpactLevel }) {
  const s: Record<ImpactLevel, string> = {
    low: 'bg-teal-50 text-teal-600 border-teal-100',
    medium: 'bg-amber-50 text-amber-600 border-amber-100',
    high: 'bg-red-50 text-red-600 border-red-100',
  };
  return <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${s[complexity]}`}>{complexity} complexity</span>;
}

export function QueryTypeBadge({ type }: { type: string }) {
  const s: Record<string, string> = {
    competitive: 'bg-red-50 text-red-600 border-red-200',
    market_data: 'bg-teal-50 text-teal-600 border-teal-200',
    economic: 'bg-purple-50 text-purple-600 border-purple-200',
    industry: 'bg-amber-50 text-amber-600 border-amber-200',
    partnership: 'bg-blue-50 text-blue-600 border-blue-200',
    briefing: 'bg-gray-100 text-gray-600 border-gray-200',
    general: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const label = type.replace('_', ' ');
  return <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${s[type] || s.general}`}>{label}</span>;
}

export function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'mixed' | 'negative' | 'neutral' }) {
  const s = {
    positive: 'bg-teal-50 text-teal-600 border-teal-200',
    mixed: 'bg-amber-50 text-amber-600 border-amber-200',
    negative: 'bg-red-50 text-red-600 border-red-200',
    neutral: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${s[sentiment]}`}>{sentiment}</span>;
}

export function EventTypeBadge({ type }: { type: string }) {
  const s: Record<string, string> = {
    funding_round: 'bg-teal-50 text-teal-600 border-teal-200',
    acquisition: 'bg-blue-50 text-blue-600 border-blue-200',
    merger: 'bg-purple-50 text-purple-600 border-purple-200',
    ipo: 'bg-amber-50 text-amber-600 border-amber-200',
    spac: 'bg-amber-50 text-amber-600 border-amber-200',
    shutdown: 'bg-red-50 text-red-600 border-red-200',
  };
  const label = type.replace('_', ' ');
  return <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${s[type] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{label}</span>;
}

export function FrequencyBadge({ frequency }: { frequency: 'common' | 'occasional' | 'rare' }) {
  const s = {
    common: 'bg-blue-50 text-blue-600 border-blue-200',
    occasional: 'bg-gray-100 text-gray-500 border-gray-200',
    rare: 'bg-gray-50 text-gray-400 border-gray-200',
  };
  return <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${s[frequency]}`}>{frequency}</span>;
}
