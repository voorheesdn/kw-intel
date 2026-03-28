import type { SmartData } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Primitives';
import { ImpactBadge, QueryTypeBadge, UrgencyBadge, PriorityBadge, OwnerBadge } from '@/components/ui/Badges';

export function SmartResult({ data }: { data: SmartData }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{data.title}</h2>
          <p className="font-mono text-xs text-gray-400 mt-0.5 uppercase tracking-wider">Intelligence Report</p>
        </div>
        <QueryTypeBadge type={data.queryType} />
      </div>

      <Card>
        <SectionLabel>Executive Summary</SectionLabel>
        <p className="text-sm text-gray-700 leading-relaxed">{data.executiveSummary}</p>
      </Card>

      {data.findings?.length > 0 && (
        <div>
          <SectionLabel>Key Findings</SectionLabel>
          <div className="space-y-2">
            {data.findings.map((f, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-1.5">
                  <div className="font-semibold text-sm text-gray-900">{f.finding}</div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {f.timeframe && <span className="font-mono text-xs text-gray-400">{f.timeframe}</span>}
                    <ImpactBadge level={f.significance} />
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{f.detail}</p>
                {f.source && <p className="font-mono text-xs text-gray-400 mt-2">Source: {f.source}</p>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.bottomLine && (
        <Card className="border-l-2 border-l-[#2D7DD2] bg-blue-50/30">
          <SectionLabel>Bottom Line</SectionLabel>
          <p className="text-sm text-gray-800 leading-relaxed font-medium">{data.bottomLine}</p>
        </Card>
      )}

      {data.implications?.length > 0 && (
        <div>
          <SectionLabel>Implications</SectionLabel>
          <div className="space-y-2">
            {data.implications.map((impl, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 uppercase tracking-wide shrink-0">{impl.area}</span>
                    <p className="text-sm text-gray-700">{impl.implication}</p>
                  </div>
                  <UrgencyBadge urgency={impl.urgency} />
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
            {data.recommendedActions.map((a, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-gray-800 flex-1">{a.action}</p>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <PriorityBadge priority={a.priority} />
                    <OwnerBadge owner={a.owner} />
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
