import type { SentimentData } from '@/lib/types';
import { Card, SectionLabel, TagList } from '@/components/ui/Primitives';
import { SentimentBadge, FrequencyBadge, MaterialityMeter } from '@/components/ui/Badges';

export function SentimentResult({ data }: { data: SentimentData }) {
  const score = Number(data.sentimentScore) || 0;
  const sentimentColor = data.overallSentiment === 'positive' ? '#45B69C' : data.overallSentiment === 'negative' ? '#E8453C' : '#F4A261';
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{data.product}</h2>
          <p className="font-mono text-xs text-gray-400 mt-0.5 uppercase tracking-wider">Agent Sentiment Analysis</p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xs text-gray-400 mb-1 uppercase tracking-wider">Sentiment</div>
          <div className="text-3xl font-bold leading-none" style={{ color: sentimentColor }}>
            {score}<span className="text-sm text-gray-400 font-normal">/10</span>
          </div>
          <div className="mt-1"><SentimentBadge sentiment={data.overallSentiment} /></div>
        </div>
      </div>

      {data.themes?.length > 0 && (
        <div>
          <SectionLabel>Themes</SectionLabel>
          <div className="space-y-3">
            {data.themes.map((t, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="font-semibold text-sm text-gray-900">{t.theme}</div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <SentimentBadge sentiment={t.sentiment} />
                    <FrequencyBadge frequency={t.frequency} />
                  </div>
                </div>
                {t.exampleQuotes?.length > 0 && (
                  <div className="space-y-1.5">
                    {t.exampleQuotes.map((q, j) => (
                      <div key={j} className="bg-gray-50 rounded p-2.5 text-sm text-gray-600 italic border-l-2 border-l-gray-300">
                        &ldquo;{q}&rdquo;
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <SectionLabel>Agent Pain Points</SectionLabel>
          <Card><TagList items={data.agentPainPoints || []} variant="red" /></Card>
        </div>
        <div>
          <SectionLabel>Feature Requests</SectionLabel>
          <Card><TagList items={data.featureRequests || []} variant="blue" /></Card>
        </div>
      </div>

      {data.competitiveComparisons?.length > 0 && (
        <div>
          <SectionLabel>Competitive Comparisons</SectionLabel>
          <div className="space-y-2">
            {data.competitiveComparisons.map((c, i) => (
              <Card key={i}>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide shrink-0">{c.competitor}</span>
                  <p className="text-sm text-gray-700 flex-1">{c.comparison}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.implicationsForKW && (
        <Card className="border-l-2 border-l-[#2D7DD2]">
          <SectionLabel>Implications for KW</SectionLabel>
          <p className="text-sm text-gray-700 leading-relaxed">{data.implicationsForKW}</p>
        </Card>
      )}
    </div>
  );
}
