import type { FundingData } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Primitives';
import { ImpactBadge, EventTypeBadge } from '@/components/ui/Badges';

export function FundingResult({ data }: { data: FundingData }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{data.topic}</h2>
        <p className="font-mono text-xs text-gray-400 mt-0.5 uppercase tracking-wider">Funding & M&A Tracker</p>
      </div>

      {data.recentActivity?.length > 0 && (
        <div>
          <SectionLabel>Recent Activity ({data.recentActivity.length})</SectionLabel>
          <div className="space-y-3">
            {data.recentActivity.map((a, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{a.company}</div>
                    {a.amount && <div className="text-lg font-bold text-[#2D7DD2] mt-0.5">{a.amount}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <EventTypeBadge type={a.eventType} />
                    <ImpactBadge level={a.significance} />
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{a.detail}</p>
                {a.investors?.length > 0 && (
                  <p className="font-mono text-xs text-gray-400 mb-1">Investors: {a.investors.join(', ')}</p>
                )}
                <p className="font-mono text-xs text-gray-400">{a.date}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.trendAnalysis && (
        <Card><SectionLabel>Trend Analysis</SectionLabel><p className="text-sm text-gray-700 leading-relaxed">{data.trendAnalysis}</p></Card>
      )}

      {data.implicationsForKW && (
        <Card className="border-l-2 border-l-[#2D7DD2]">
          <SectionLabel>Implications for KW</SectionLabel>
          <p className="text-sm text-gray-700 leading-relaxed">{data.implicationsForKW}</p>
        </Card>
      )}

      {data.companiesToWatch?.length > 0 && (
        <div>
          <SectionLabel>Companies to Watch</SectionLabel>
          <div className="space-y-2">
            {data.companiesToWatch.map((c, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-900 mb-1">{c.company}</div>
                    <p className="text-sm text-gray-600">{c.reason}</p>
                  </div>
                  <span className="font-mono text-xs text-gray-400 shrink-0">{c.timeline}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
