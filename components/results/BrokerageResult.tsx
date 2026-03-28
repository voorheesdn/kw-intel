import type { BrokerageData } from '@/lib/types';
import { Card, SectionLabel, TagList } from '@/components/ui/Primitives';
import { ImpactBadge, MaterialityMeter } from '@/components/ui/Badges';

export function BrokerageResult({ data }: { data: BrokerageData }) {
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
          <div className="text-3xl font-bold leading-none" style={{ color: scoreColor }}>{score}<span className="text-sm text-gray-400 font-normal">/10</span></div>
          <div className="w-28 mt-2"><MaterialityMeter score={score} /></div>
        </div>
      </div>

      <Card><SectionLabel>Summary</SectionLabel><p className="text-sm text-gray-700 leading-relaxed">{data.summary}</p></Card>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <SectionLabel>Agent Count</SectionLabel>
          <p className="text-lg font-semibold text-gray-900">{data.agentCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">{data.growthTrajectory}</p>
        </Card>
        <Card><SectionLabel>Split / Cap Model</SectionLabel><p className="text-sm text-gray-700">{data.splitModel}</p></Card>
        <Card><SectionLabel>Tech Stack</SectionLabel><p className="text-sm text-gray-700">{data.techStack}</p></Card>
      </div>

      <Card><SectionLabel>Recruiting Strategy</SectionLabel><p className="text-sm text-gray-700 leading-relaxed">{data.recruitingStrategy}</p></Card>

      {data.recentMoves?.length > 0 && (
        <div>
          <SectionLabel>Recent Moves</SectionLabel>
          <div className="space-y-2">
            {data.recentMoves.map((m, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 mb-1">{m.title}</div>
                    <p className="text-sm text-gray-600 leading-relaxed">{m.detail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <ImpactBadge level={m.impact} />
                    <span className="font-mono text-xs text-gray-400">{m.date}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div><SectionLabel>Agent Value Props</SectionLabel><Card><TagList items={data.agentValueProps || []} variant="teal" /></Card></div>
        <div><SectionLabel>Weaknesses</SectionLabel><Card><TagList items={data.weaknesses || []} variant="red" /></Card></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-2 border-l-red-400"><SectionLabel>Threat to KW</SectionLabel><p className="text-sm text-gray-700 leading-relaxed">{data.threatToKW}</p></Card>
        <Card className="border-l-2 border-l-teal-400"><SectionLabel>Opportunity for KW</SectionLabel><p className="text-sm text-gray-700 leading-relaxed">{data.opportunityForKW}</p></Card>
      </div>

      {data.signalsToWatch?.length > 0 && (
        <div>
          <SectionLabel>Signals to Watch</SectionLabel>
          <Card>
            <ul className="space-y-2">
              {data.signalsToWatch.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-amber-400 mt-0.5 shrink-0">&#9670;</span>{s}</li>)}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
