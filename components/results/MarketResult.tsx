import type { MarketData } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Primitives';
import { ImpactBadge, TimeframeBadge, PriorityBadge, OwnerBadge, AreaBadge } from '@/components/ui/Badges';

export function MarketResult({ data }: { data: MarketData }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{data.topic}</h2>
        <p className="font-mono text-xs text-gray-400 mt-0.5 uppercase tracking-wider">Market Intelligence Report</p>
      </div>

      <Card><SectionLabel>Executive Summary</SectionLabel><p className="text-sm text-gray-700 leading-relaxed">{data.executiveSummary}</p></Card>

      {data.trends?.length > 0 && (
        <div>
          <SectionLabel>Trends</SectionLabel>
          <div className="space-y-2">
            {data.trends.map((t, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-1.5">
                  <div className="font-semibold text-sm text-gray-900">{t.trend}</div>
                  <div className="flex items-center gap-1.5 shrink-0"><TimeframeBadge timeframe={t.timeframe} /><ImpactBadge level={t.impact} /></div>
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
              {data.agentBehaviorSignals.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-blue-400 mt-0.5 shrink-0">&rarr;</span>{s}</li>)}
            </ul>
          </Card>
        </div>
      )}

      {data.implicationsForKW?.length > 0 && (
        <div>
          <SectionLabel>Implications for KW</SectionLabel>
          <div className="space-y-2">
            {data.implicationsForKW.map((impl, i) => (
              <Card key={i}><div className="flex items-start gap-3"><AreaBadge area={impl.area} /><p className="text-sm text-gray-700 flex-1">{impl.implication}</p></div></Card>
            ))}
          </div>
        </div>
      )}

      {data.recommendedActions?.length > 0 && (
        <div>
          <SectionLabel>Recommended Actions</SectionLabel>
          <div className="space-y-2">
            {data.recommendedActions.map((a, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-gray-800 flex-1">{a.action}</p>
                  <div className="flex flex-col items-end gap-1.5 shrink-0"><PriorityBadge priority={a.priority} /><OwnerBadge owner={a.owner} /></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
