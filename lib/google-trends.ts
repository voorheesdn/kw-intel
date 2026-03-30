// ─── Google Trends Client ───────────────────────────────────────────────────
// Search interest data for housing demand signals and brand comparison.
// Uses the google-trends-api npm package (no API key needed).

// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleTrends = require('google-trends-api');

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrendPoint {
  formattedTime: string;
  value: number[];
  formattedAxisTime: string;
}

interface TrendsResponse {
  default: {
    timelineData: TrendPoint[];
    averages: number[];
  };
}

// State codes for geo filtering
const STATE_GEO: Record<string, string> = {
  AL: 'US-AL', AK: 'US-AK', AZ: 'US-AZ', AR: 'US-AR', CA: 'US-CA',
  CO: 'US-CO', CT: 'US-CT', DE: 'US-DE', FL: 'US-FL', GA: 'US-GA',
  HI: 'US-HI', ID: 'US-ID', IL: 'US-IL', IN: 'US-IN', IA: 'US-IA',
  KS: 'US-KS', KY: 'US-KY', LA: 'US-LA', ME: 'US-ME', MD: 'US-MD',
  MA: 'US-MA', MI: 'US-MI', MN: 'US-MN', MS: 'US-MS', MO: 'US-MO',
  MT: 'US-MT', NE: 'US-NE', NV: 'US-NV', NH: 'US-NH', NJ: 'US-NJ',
  NM: 'US-NM', NY: 'US-NY', NC: 'US-NC', ND: 'US-ND', OH: 'US-OH',
  OK: 'US-OK', OR: 'US-OR', PA: 'US-PA', RI: 'US-RI', SC: 'US-SC',
  SD: 'US-SD', TN: 'US-TN', TX: 'US-TX', UT: 'US-UT', VT: 'US-VT',
  VA: 'US-VA', WA: 'US-WA', WV: 'US-WV', WI: 'US-WI', WY: 'US-WY',
  DC: 'US-DC',
};

// ─── Fetch housing demand trends ────────────────────────────────────────────

interface DemandTrend {
  keyword: string;
  geo: string;
  currentInterest: number;       // most recent value (0-100)
  avgInterest: number;           // average over period
  thirtyDayChange: number;       // % change last 30 days
  trend: 'rising' | 'falling' | 'stable';
  dataPoints: { date: string; value: number }[];
}

async function fetchTrend(keyword: string, geo: string): Promise<DemandTrend | null> {
  try {
    const result = await googleTrends.interestOverTime({
      keyword,
      geo,
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    });

    const data: TrendsResponse = JSON.parse(result);
    const timeline = data.default?.timelineData || [];

    if (timeline.length < 7) return null;

    const values = timeline.map(t => t.value[0]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const current = values[values.length - 1];

    // 30-day change: compare last 7 days avg vs 30-days-ago 7-day avg
    const recent7 = values.slice(-7);
    const older7 = values.slice(-37, -30);
    const recentAvg = recent7.reduce((a, b) => a + b, 0) / recent7.length;
    const olderAvg = older7.length > 0
      ? older7.reduce((a, b) => a + b, 0) / older7.length
      : recentAvg;

    const pctChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    const trend = pctChange > 10 ? 'rising' : pctChange < -10 ? 'falling' : 'stable';

    // Weekly summary (sample every 7th point)
    const dataPoints = timeline
      .filter((_, i) => i % 7 === 0 || i === timeline.length - 1)
      .map(t => ({ date: t.formattedTime, value: t.value[0] }));

    return {
      keyword,
      geo,
      currentInterest: current,
      avgInterest: Math.round(avg),
      thirtyDayChange: Math.round(pctChange),
      trend,
      dataPoints,
    };
  } catch (err) {
    console.error(`Google Trends error for "${keyword}":`, err);
    return null;
  }
}

// ─── Brand comparison ───────────────────────────────────────────────────────

interface BrandComparison {
  brands: { name: string; currentInterest: number; avgInterest: number }[];
}

async function fetchBrandComparison(brands: string[], geo = 'US'): Promise<BrandComparison | null> {
  try {
    const result = await googleTrends.interestOverTime({
      keyword: brands,
      geo,
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    });

    const data: TrendsResponse = JSON.parse(result);
    const timeline = data.default?.timelineData || [];

    if (timeline.length < 7) return null;

    return {
      brands: brands.map((name, i) => {
        const values = timeline.map(t => t.value[i]);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return {
          name,
          currentInterest: values[values.length - 1],
          avgInterest: Math.round(avg),
        };
      }),
    };
  } catch (err) {
    console.error('Google Trends brand comparison error:', err);
    return null;
  }
}

// ─── Format for AI prompt injection ─────────────────────────────────────────

function formatTrendForAI(trend: DemandTrend): string {
  const arrow = trend.trend === 'rising' ? '↑' : trend.trend === 'falling' ? '↓' : '→';
  const changeStr = trend.thirtyDayChange >= 0 ? `+${trend.thirtyDayChange}%` : `${trend.thirtyDayChange}%`;
  return `  - "${trend.keyword}": current ${trend.currentInterest}/100, avg ${trend.avgInterest}/100, 30-day trend: ${changeStr} ${arrow} (${trend.trend})`;
}

// ─── Main enrichment function ───────────────────────────────────────────────

export async function fetchGoogleTrendsContext(
  city?: string,
  state?: string,
  query?: string
): Promise<string | null> {
  const geo = state ? (STATE_GEO[state.toUpperCase()] || 'US') : 'US';
  const parts: string[] = ['GOOGLE TRENDS — SEARCH INTEREST DATA (live, 0-100 scale):'];

  try {
    const tasks: Promise<void>[] = [];

    // 1. Housing demand signal for the market
    if (city) {
      tasks.push(
        fetchTrend(`homes for sale in ${city}`, geo).then(trend => {
          if (trend) parts.push(formatTrendForAI(trend));
        })
      );
    }

    // 2. Brand comparison (always include)
    tasks.push(
      fetchBrandComparison(
        ['Keller Williams', 'Compass real estate', 'eXp Realty'],
        geo
      ).then(comp => {
        if (comp) {
          parts.push('  Brand Search Interest (90-day avg, higher = more consumer awareness):');
          for (const b of comp.brands) {
            parts.push(`    - ${b.name}: ${b.avgInterest}/100 (current: ${b.currentInterest}/100)`);
          }
        }
      })
    );

    // 3. If query mentions competitors, do a focused comparison
    const lower = (query || '').toLowerCase();
    const mentionedBrands: string[] = [];
    const brandMap: Record<string, string> = {
      'redfin': 'Redfin',
      're/max': 'RE/MAX',
      'remax': 'RE/MAX',
      'coldwell banker': 'Coldwell Banker',
      'century 21': 'Century 21',
      'zillow': 'Zillow',
    };
    for (const [trigger, name] of Object.entries(brandMap)) {
      if (lower.includes(trigger)) mentionedBrands.push(name);
    }
    if (mentionedBrands.length > 0) {
      tasks.push(
        fetchBrandComparison([...mentionedBrands, 'Keller Williams'], geo).then(comp => {
          if (comp) {
            parts.push(`  Additional Brand Comparison (vs KW):`);
            for (const b of comp.brands) {
              parts.push(`    - ${b.name}: ${b.avgInterest}/100 (current: ${b.currentInterest}/100)`);
            }
          }
        })
      );
    }

    await Promise.all(tasks);

    return parts.length > 1 ? parts.join('\n') : null;
  } catch (err) {
    console.error('Google Trends enrichment error:', err);
    return null;
  }
}
