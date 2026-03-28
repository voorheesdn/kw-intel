// ─── FRED Series Definitions ──────────────────────────────────────────────────

export interface FredSeries {
  id: string;
  label: string;
  shortLabel: string;
  category: 'mortgage' | 'prices' | 'supply' | 'economic' | 'affordability';
  unit: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  format: 'percent' | 'index' | 'thousands' | 'millions' | 'number' | 'currency';
}

export const FRED_SERIES: FredSeries[] = [
  // Mortgage Rates
  { id: 'MORTGAGE30US', label: '30-Year Fixed Rate Mortgage Average', shortLabel: '30Y Mortgage', category: 'mortgage', unit: '%', frequency: 'weekly', format: 'percent' },
  { id: 'MORTGAGE15US', label: '15-Year Fixed Rate Mortgage Average', shortLabel: '15Y Mortgage', category: 'mortgage', unit: '%', frequency: 'weekly', format: 'percent' },
  // Home Prices
  { id: 'CSUSHPINSA', label: 'S&P/Case-Shiller U.S. National Home Price Index', shortLabel: 'Case-Shiller Index', category: 'prices', unit: 'Index', frequency: 'monthly', format: 'index' },
  { id: 'MSPUS', label: 'Median Sales Price of Houses Sold', shortLabel: 'Median Price', category: 'prices', unit: '$', frequency: 'quarterly', format: 'currency' },
  // Housing Supply & Activity
  { id: 'HOUST', label: 'Housing Starts', shortLabel: 'Starts', category: 'supply', unit: 'K units', frequency: 'monthly', format: 'thousands' },
  { id: 'PERMIT', label: 'Building Permits', shortLabel: 'Permits', category: 'supply', unit: 'K units', frequency: 'monthly', format: 'thousands' },
  { id: 'MSACSR', label: 'Monthly Supply of New Houses', shortLabel: 'Months Supply', category: 'supply', unit: 'months', frequency: 'monthly', format: 'number' },
  { id: 'EXHOSLUSM495S', label: 'Existing Home Sales', shortLabel: 'Existing Sales', category: 'supply', unit: 'M units', frequency: 'monthly', format: 'millions' },
  { id: 'ACTLISCOUUS', label: 'Active Listing Count, US', shortLabel: 'Active Listings', category: 'supply', unit: 'listings', frequency: 'monthly', format: 'number' },
  { id: 'NEWLISCOUUS', label: 'New Listing Count, US', shortLabel: 'New Listings', category: 'supply', unit: 'listings', frequency: 'monthly', format: 'number' },
  // Economic Indicators
  { id: 'FEDFUNDS', label: 'Federal Funds Effective Rate', shortLabel: 'Fed Rate', category: 'economic', unit: '%', frequency: 'monthly', format: 'percent' },
  { id: 'CPIAUCSL', label: 'Consumer Price Index', shortLabel: 'CPI', category: 'economic', unit: 'Index', frequency: 'monthly', format: 'index' },
  { id: 'UNRATE', label: 'Unemployment Rate', shortLabel: 'Unemployment', category: 'economic', unit: '%', frequency: 'monthly', format: 'percent' },
  { id: 'GDP', label: 'Gross Domestic Product', shortLabel: 'GDP', category: 'economic', unit: '$B', frequency: 'quarterly', format: 'number' },
  { id: 'UMCSENT', label: 'Consumer Sentiment', shortLabel: 'Sentiment', category: 'economic', unit: 'Index', frequency: 'monthly', format: 'index' },
  { id: 'DSPIC96', label: 'Real Disposable Personal Income', shortLabel: 'Disp. Income', category: 'economic', unit: '$B', frequency: 'monthly', format: 'number' },
  // Affordability
  { id: 'MDSP', label: 'Mortgage Debt Service as % of Disposable Income', shortLabel: 'Mortgage Burden', category: 'affordability', unit: '%', frequency: 'quarterly', format: 'percent' },
  { id: 'TDSP', label: 'Household Debt Service as % of Disposable Income', shortLabel: 'Debt Burden', category: 'affordability', unit: '%', frequency: 'quarterly', format: 'percent' },
];

export const FRED_CATEGORIES = [
  { key: 'mortgage' as const, label: 'Mortgage & Affordability' },
  { key: 'prices' as const, label: 'Home Prices' },
  { key: 'supply' as const, label: 'Supply & Activity' },
  { key: 'economic' as const, label: 'Economic Context' },
  { key: 'affordability' as const, label: 'Affordability' },
];

// ─── FRED API Types ───────────────────────────────────────────────────────────

export interface FredObservation {
  date: string;
  value: string;
}

export interface FredSeriesData {
  seriesId: string;
  observations: FredObservation[];
}

// ─── Helper: format values for display ────────────────────────────────────────

export function formatFredValue(value: string | number, series: FredSeries): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';

  switch (series.format) {
    case 'percent':
      return `${num.toFixed(2)}%`;
    case 'currency':
      return num >= 1000 ? `$${(num / 1000).toFixed(0)}K` : `$${num.toLocaleString()}`;
    case 'index':
      return num.toFixed(1);
    case 'thousands':
      // FRED returns values already in thousands (e.g., 1487 = 1,487 thousand units)
      return num >= 1000 ? `${(num / 1000).toFixed(2)}M` : `${num.toLocaleString()}K`;
    case 'millions':
      // FRED returns values already in millions (e.g., 4.09 = 4.09 million units)
      return `${num.toFixed(2)}M`;
    case 'number':
      return num.toLocaleString();
    default:
      return num.toLocaleString();
  }
}

export function computeChange(observations: FredObservation[]): { change: number; direction: 'up' | 'down' | 'flat' } | null {
  const valid = observations.filter(o => o.value !== '.');
  if (valid.length < 2) return null;
  const current = parseFloat(valid[0].value);
  const previous = parseFloat(valid[1].value);
  if (isNaN(current) || isNaN(previous) || previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return {
    change,
    direction: Math.abs(change) < 0.01 ? 'flat' : change > 0 ? 'up' : 'down',
  };
}

// ─── FRED series relevant to a query (for AI enrichment) ─────────────────────

const MARKET_KEYWORDS: Record<string, string[]> = {
  MORTGAGE30US: ['mortgage', 'rate', 'interest', 'financing', 'lending', 'affordability', '30-year', '30 year'],
  MORTGAGE15US: ['mortgage', '15-year', '15 year'],
  CSUSHPINSA: ['home price', 'house price', 'appreciation', 'case-shiller', 'case shiller', 'home value'],
  MSPUS: ['median price', 'home price', 'house price', 'sales price'],
  HOUST: ['housing start', 'new construction', 'homebuilding', 'builder'],
  PERMIT: ['building permit', 'permit', 'new construction'],
  MSACSR: ['supply', 'months of supply', 'inventory', 'housing supply'],
  EXHOSLUSM495S: ['existing home', 'home sales', 'existing sales', 'resale'],
  ACTLISCOUUS: ['listing', 'active listing', 'inventory', 'supply'],
  NEWLISCOUUS: ['new listing', 'listing'],
  FEDFUNDS: ['fed', 'federal funds', 'interest rate', 'monetary policy', 'fed rate'],
  CPIAUCSL: ['inflation', 'cpi', 'consumer price', 'price index'],
  UNRATE: ['unemployment', 'jobs', 'employment', 'labor'],
  GDP: ['gdp', 'gross domestic', 'economic growth', 'economy'],
  UMCSENT: ['consumer sentiment', 'confidence', 'sentiment'],
  DSPIC96: ['disposable income', 'personal income', 'income'],
  MDSP: ['mortgage burden', 'debt service', 'affordability', 'mortgage payment'],
  TDSP: ['household debt', 'debt burden', 'debt service'],
};

export function getRelevantSeriesIds(query: string): string[] {
  const lower = query.toLowerCase();
  const matches: string[] = [];
  for (const [seriesId, keywords] of Object.entries(MARKET_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matches.push(seriesId);
    }
  }
  return matches;
}
