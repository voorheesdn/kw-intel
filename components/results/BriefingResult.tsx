import type { BriefingData } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Primitives';
import { ImpactBadge, MaterialityMeter } from '@/components/ui/Badges';

export function BriefingResult({ data }: { data: BriefingData }) {
  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-gray-200">
        <div className="font-mono text-xs text-red-500 uppercase tracking-widest mb-1">{data.classification}</div>
        <h2 className="text-2xl font-semibold text-gray-900">{data.title}</h2>
        <p className="font-mono text-xs text-gray-400 mt-0.5">{data.date}</p>
      </div>

      <Card className="border-l-2 border-l-blue-400"><SectionLabel>Executive Summary</SectionLabel><p className="text-sm text-gray-700 leading-relaxed">{data.executiveSummary}</p></Card>

      {data.materialDevelopments?.length > 0 && (
        <div>
          <SectionLabel>Material Developments</SectionLabel>
          <div className="space-y-3">
            {data.materialDevelopments.map((d, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="font-semibold text-sm text-gray-900 flex-1">{d.development}</div>
                  <div className="shrink-0 w-28"><div className="font-mono text-xs text-gray-400 mb-1 text-right">Materiality</div><MaterialityMeter score={d.materialityScore} /></div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{d.detail}</p>
                {d.source && <p className="font-mono text-xs text-gray-400 mb-2">Source: {d.source}</p>}
                <div className="bg-amber-50 rounded-md p-2.5">
                  <div className="font-mono text-xs text-amber-500 uppercase tracking-wider mb-0.5">Recommended Response</div>
                  <p className="text-sm text-amber-900">{d.recommendedResponse}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card><SectionLabel>Competitive Landscape</SectionLabel><p className="text-sm text-gray-700 leading-relaxed">{data.competitiveLandscape}</p></Card>
        <Card><SectionLabel>Partnership Pipeline</SectionLabel><p className="text-sm text-gray-700 leading-relaxed">{data.partnershipPipeline}</p></Card>
      </div>

      {data.risksAndThreats?.length > 0 && (
        <div>
          <SectionLabel>Risks & Threats</SectionLabel>
          <div className="space-y-2">
            {data.risksAndThreats.map((r, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="font-semibold text-sm text-gray-900">{r.risk}</div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-xs text-gray-400">L:</span><ImpactBadge level={r.likelihood} />
                    <span className="font-mono text-xs text-gray-400">I:</span><ImpactBadge level={r.impact} />
                  </div>
                </div>
                <p className="text-sm text-gray-600">{r.detail}</p>
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
                  <span className="font-mono text-xs text-gray-400 mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>{item}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      {data.nextBriefingFocus && (
        <Card className="bg-gray-50"><SectionLabel>Next Briefing Focus</SectionLabel><p className="text-sm text-gray-600">{data.nextBriefingFocus}</p></Card>
      )}
    </div>
  );
}
