import type { PartnershipData } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Primitives';
import { ImpactBadge, RecBadge, ComplexityBadge } from '@/components/ui/Badges';

export function PartnershipResult({ data }: { data: PartnershipData }) {
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
            {data.opportunities.map((o, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{o.company}</div>
                    <div className="font-mono text-xs text-gray-400 mt-0.5">{o.product}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <RecBadge rec={o.recommendation} />
                    <ComplexityBadge complexity={o.integrationComplexity} />
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2.5">{o.description}</p>
                <div className="bg-blue-50 rounded-md p-2.5 mb-2.5">
                  <div className="font-mono text-xs text-blue-400 uppercase tracking-wider mb-0.5">Agent Value</div>
                  <p className="text-sm text-blue-800">{o.agentValueProp}</p>
                </div>
                {o.competitorAdoption && <p className="font-mono text-xs text-gray-400 mb-2">Competitor adoption: {o.competitorAdoption}</p>}
                <p className="text-sm text-gray-500 italic">{o.rationale}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
