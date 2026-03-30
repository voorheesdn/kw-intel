// ─── Tavily Search API Client ───────────────────────────────────────────────
// Real-time web search for competitor news, market reports, and industry intel.

const TAVILY_API = 'https://api.tavily.com/search';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

// ─── Build search queries from the user's question ──────────────────────────

function buildSearchQueries(query: string): string[] {
  const queries: string[] = [];
  const lower = query.toLowerCase();

  // Always search the raw query with a real estate lens
  queries.push(`${query} real estate industry 2025 2026`);

  // Competitor-specific news searches
  const competitors = [
    { names: ['compass'], search: 'Compass Inc real estate' },
    { names: ['exp', 'expi', 'exp realty'], search: 'eXp Realty eXp World Holdings' },
    { names: ['remax', 're/max', 're max'], search: 'RE/MAX Holdings' },
    { names: ['redfin'], search: 'Redfin Corporation' },
    { names: ['anywhere', 'realogy', 'coldwell banker', 'century 21', "sotheby's"], search: 'Anywhere Real Estate' },
    { names: ['douglas elliman', 'elliman'], search: 'Douglas Elliman' },
    { names: ['zillow'], search: 'Zillow Group' },
    { names: ['keller williams', 'kw '], search: 'Keller Williams Realty' },
  ];

  for (const comp of competitors) {
    if (comp.names.some(n => lower.includes(n))) {
      queries.push(`${comp.search} latest news earnings agent count`);
    }
  }

  // Market-specific searches
  const marketTerms = ['market share', 'market trend', 'housing market', 'real estate market'];
  if (marketTerms.some(t => lower.includes(t))) {
    queries.push(`${query} latest data statistics`);
  }

  return queries.slice(0, 3); // Cap at 3 searches to control costs/latency
}

// ─── Fetch and format Tavily results ────────────────────────────────────────

export async function fetchTavilyContext(query: string): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  const searchQueries = buildSearchQueries(query);

  try {
    const allResults: TavilyResult[] = [];

    const responses = await Promise.all(
      searchQueries.map(async (q) => {
        const res = await fetch(TAVILY_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: q,
            search_depth: 'basic',
            max_results: 5,
            include_answer: false,
          }),
        });

        if (!res.ok) {
          console.error(`Tavily search error: ${res.status}`);
          return null;
        }

        const data: TavilyResponse = await res.json();
        return data.results || [];
      })
    );

    for (const results of responses) {
      if (results) allResults.push(...results);
    }

    if (allResults.length === 0) return null;

    // Deduplicate by URL and sort by relevance score
    const seen = new Set<string>();
    const unique = allResults.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    }).sort((a, b) => b.score - a.score);

    // Take top 8 most relevant results
    const top = unique.slice(0, 8);

    const lines = ['RECENT NEWS & WEB INTELLIGENCE (from Tavily, live web search):'];
    for (const r of top) {
      const date = r.published_date ? ` (${r.published_date.split('T')[0]})` : '';
      const snippet = r.content.length > 300 ? r.content.slice(0, 300) + '...' : r.content;
      lines.push(`- ${r.title}${date}`);
      lines.push(`  ${snippet}`);
      lines.push(`  Source: ${r.url}`);
    }

    return lines.join('\n');
  } catch (err) {
    console.error('Tavily enrichment error:', err);
    return null;
  }
}
