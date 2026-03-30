// ─── SEC EDGAR API Client ───────────────────────────────────────────────────
// Fetches quarterly earnings data for publicly traded real estate brokerages.
// No API key needed — just a User-Agent header with contact info.

const EDGAR_BASE = 'https://data.sec.gov';
const USER_AGENT = 'KWIntelligence david.voorhees@kw.com';

// ─── Competitor Registry ────────────────────────────────────────────────────

export interface Competitor {
  name: string;
  aliases: string[];       // search terms that trigger this competitor
  cik: string;             // SEC Central Index Key (10-digit, zero-padded)
  ticker?: string;
}

export const COMPETITORS: Competitor[] = [
  {
    name: 'Anywhere Real Estate',
    aliases: ['anywhere', 'anywhere real estate', 'realogy', 'coldwell banker', 'century 21', 'sothebys', "sotheby's", 'corcoran', 'better homes and gardens real estate'],
    cik: '0001398987',
    ticker: 'HOUS',
  },
  {
    name: 'eXp World Holdings',
    aliases: ['exp', 'exp realty', 'exp world', 'expi'],
    cik: '0001495932',
    ticker: 'EXPI',
  },
  {
    name: 'Compass',
    aliases: ['compass', 'compass real estate', 'compass inc'],
    cik: '0001563190',
    ticker: 'COMP',
  },
  {
    name: 'RE/MAX Holdings',
    aliases: ['remax', 're/max', 're max'],
    cik: '0001581091',
    ticker: 'RMAX',
  },
  {
    name: 'Redfin',
    aliases: ['redfin'],
    cik: '0001382821',
    ticker: 'RDFN',
  },
  {
    name: 'Douglas Elliman',
    aliases: ['douglas elliman', 'elliman'],
    cik: '0001878897',
    ticker: 'DOUG',
  },
  {
    name: 'Zillow Group',
    aliases: ['zillow'],
    cik: '0001334814',
    ticker: 'ZG',
  },
  {
    name: 'Realogy (legacy)',
    aliases: ['realogy'],
    cik: '0001398987',
    ticker: 'HOUS',
  },
];

// ─── Detect competitors mentioned in a query ────────────────────────────────

export function detectCompetitors(query: string): Competitor[] {
  const lower = query.toLowerCase();
  const seen = new Set<string>();
  const matches: Competitor[] = [];

  for (const comp of COMPETITORS) {
    if (seen.has(comp.cik)) continue;
    for (const alias of comp.aliases) {
      if (lower.includes(alias)) {
        matches.push(comp);
        seen.add(comp.cik);
        break;
      }
    }
  }

  return matches;
}

// ─── Types for EDGAR API responses ──────────────────────────────────────────

interface EdgarFact {
  end: string;        // period end date e.g. "2024-12-31"
  val: number;
  accn: string;       // accession number
  fy: number;         // fiscal year
  fp: string;         // fiscal period: Q1, Q2, Q3, Q4, FY
  form: string;       // 10-Q, 10-K, etc.
  filed: string;      // date filed
  frame?: string;     // e.g. "CY2024Q3I"
}

interface CompanyFacts {
  cik: number;
  entityName: string;
  facts: {
    'us-gaap'?: Record<string, {
      label: string;
      description: string;
      units: Record<string, EdgarFact[]>;
    }>;
    'dei'?: Record<string, {
      label: string;
      description: string;
      units: Record<string, EdgarFact[]>;
    }>;
  };
}

// ─── Key financial concepts we want to extract ──────────────────────────────

const FINANCIAL_CONCEPTS = [
  { key: 'revenue', tags: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'Revenue'], label: 'Revenue' },
  { key: 'netIncome', tags: ['NetIncomeLoss', 'ProfitLoss'], label: 'Net Income' },
  { key: 'grossProfit', tags: ['GrossProfit'], label: 'Gross Profit' },
  { key: 'operatingIncome', tags: ['OperatingIncomeLoss'], label: 'Operating Income' },
  { key: 'totalAssets', tags: ['Assets'], label: 'Total Assets' },
  { key: 'agentCount', tags: ['NumberOfAgents', 'NumberOfSalesAgentsAndBrokers', 'NumberOfIndependentSalesAgents'], label: 'Agent Count' },
  { key: 'transactionSides', tags: ['NumberOfHomeSaleTransactions', 'NumberOfRealEstateTransactionSides', 'RealEstateTransactionVolume'], label: 'Transaction Sides' },
];

// ─── Fetch and parse company financials ─────────────────────────────────────

export interface CompetitorFinancials {
  name: string;
  ticker?: string;
  entityName: string;
  latestPeriod: string;       // e.g. "Q3 2024"
  latestFilingDate: string;
  metrics: Record<string, {
    label: string;
    value: number;
    period: string;
    priorValue?: number;
    priorPeriod?: string;
  }>;
}

function getLatestFacts(facts: EdgarFact[], formTypes = ['10-Q', '10-K']): EdgarFact[] {
  return facts
    .filter(f => formTypes.includes(f.form))
    .sort((a, b) => b.end.localeCompare(a.end));
}

export async function fetchCompetitorFinancials(competitor: Competitor): Promise<CompetitorFinancials | null> {
  try {
    const url = `${EDGAR_BASE}/api/xbrl/companyfacts/CIK${competitor.cik}.json`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`EDGAR API error for ${competitor.name}: ${res.status}`);
      return null;
    }

    const data: CompanyFacts = await res.json();
    const usGaap = data.facts?.['us-gaap'] || {};

    const metrics: CompetitorFinancials['metrics'] = {};
    let latestPeriod = '';
    let latestFilingDate = '';

    for (const concept of FINANCIAL_CONCEPTS) {
      // Try all tags and pick the one with the most recent data
      let bestLatest: EdgarFact | null = null;
      let bestSorted: EdgarFact[] = [];

      for (const tag of concept.tags) {
        const factSet = usGaap[tag];
        if (!factSet) continue;

        const units = factSet.units['USD'] || factSet.units['pure'] || Object.values(factSet.units)[0];
        if (!units || units.length === 0) continue;

        const sorted = getLatestFacts(units);
        if (sorted.length === 0) continue;

        if (!bestLatest || sorted[0].end > bestLatest.end) {
          bestLatest = sorted[0];
          bestSorted = sorted;
        }
      }

      if (!bestLatest) continue;

      // Find prior period (same fiscal period, prior year)
      const priorYear = bestSorted.find(f =>
        f.fp === bestLatest!.fp && f.fy === bestLatest!.fy - 1
      );

      metrics[concept.key] = {
        label: concept.label,
        value: bestLatest.val,
        period: `${bestLatest.fp} ${bestLatest.fy}`,
        ...(priorYear ? {
          priorValue: priorYear.val,
          priorPeriod: `${priorYear.fp} ${priorYear.fy}`,
        } : {}),
      };

      if (!latestPeriod || bestLatest.end > latestPeriod) {
        latestPeriod = `${bestLatest.fp} ${bestLatest.fy}`;
        latestFilingDate = bestLatest.filed;
      }
    }

    if (Object.keys(metrics).length === 0) return null;

    return {
      name: competitor.name,
      ticker: competitor.ticker,
      entityName: data.entityName,
      latestPeriod,
      latestFilingDate,
      metrics,
    };
  } catch (err) {
    console.error(`EDGAR fetch error for ${competitor.name}:`, err);
    return null;
  }
}

// ─── Format for AI prompt injection ─────────────────────────────────────────

function formatCurrency(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function formatChange(current: number, prior: number): string {
  if (prior === 0) return '';
  const pctChange = ((current - prior) / Math.abs(prior)) * 100;
  const sign = pctChange >= 0 ? '+' : '';
  return ` (${sign}${pctChange.toFixed(1)}% YoY)`;
}

export function formatCompetitorForAI(financials: CompetitorFinancials): string {
  const lines = [
    `SEC FILING DATA for ${financials.name}${financials.ticker ? ` (${financials.ticker})` : ''} — from SEC EDGAR:`,
    `  Entity: ${financials.entityName}`,
    `  Latest Period: ${financials.latestPeriod} (filed ${financials.latestFilingDate})`,
  ];

  const currencyKeys = ['revenue', 'netIncome', 'grossProfit', 'operatingIncome', 'totalAssets'];

  for (const [key, metric] of Object.entries(financials.metrics)) {
    const isCurrency = currencyKeys.includes(key);
    const formatted = isCurrency ? formatCurrency(metric.value) : metric.value.toLocaleString();
    const change = metric.priorValue !== undefined
      ? formatChange(metric.value, metric.priorValue)
      : '';
    const priorFormatted = metric.priorValue !== undefined
      ? ` | Prior ${metric.priorPeriod}: ${isCurrency ? formatCurrency(metric.priorValue) : metric.priorValue.toLocaleString()}`
      : '';
    lines.push(`  - ${metric.label}: ${formatted}${change}${priorFormatted}`);
  }

  return lines.join('\n');
}

// ─── Main enrichment function ───────────────────────────────────────────────

export async function fetchCompetitorContext(query: string): Promise<string | null> {
  const competitors = detectCompetitors(query);
  if (competitors.length === 0) return null;

  try {
    const results = await Promise.all(
      competitors.map(c => fetchCompetitorFinancials(c))
    );

    const formatted = results
      .filter((r): r is CompetitorFinancials => r !== null)
      .map(formatCompetitorForAI);

    return formatted.length > 0 ? formatted.join('\n\n') : null;
  } catch (err) {
    console.error('SEC EDGAR enrichment error:', err);
    return null;
  }
}
