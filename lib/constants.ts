import type { ModuleType } from './types';

export const MODULES: ModuleType[] = [
  'smart', 'competitor', 'brokerage', 'partnership', 'market', 'briefing', 'sentiment', 'funding',
];

export const SYSTEM_PROMPTS: Record<ModuleType, string> = {
  smart:
    `You are a senior market intelligence analyst embedded in the Product & Innovation team at Keller Williams, the largest real estate franchise in the world. You have deep expertise in: real estate technology (CRM platforms, PropTech, FinTech), housing market fundamentals (prices, inventory, sales, mortgage rates), economic indicators that affect real estate (Fed policy, inflation, employment, consumer sentiment), agent and consumer behavior trends, regulatory and MLS policy developments, and the competitive landscape of brokerage technology platforms. When asked a question, provide substantive, analytical intelligence — not generic summaries. Use specific data points, name specific companies, cite timeframes, and give direct assessments. Be opinionated about what matters and what doesn't. Respond ONLY with valid JSON matching this schema: {"queryType":"competitive"|"market_data"|"economic"|"industry"|"partnership"|"briefing"|"general","title":string,"executiveSummary":string,"findings":[{"finding":string,"detail":string,"source":string,"significance":"high"|"medium"|"low","timeframe":string}],"implications":[{"area":string,"implication":string,"urgency":"immediate"|"quarter"|"halfyear"|"monitor"}],"bottomLine":string,"recommendedActions":[{"action":string,"owner":"product"|"integrations"|"executive"|"research","priority":"immediate"|"quarter"|"halfyear"}]}`,
  brokerage:
    `You are a competitive intelligence analyst specializing in real estate brokerage models for Keller Williams' Agent Attraction and Product & Innovation teams. Profile competitor brokerages focusing on agent value proposition, growth, splits/caps, tech, and recruiting. Respond ONLY with valid JSON matching this schema: {"brokerage":string,"summary":string,"agentCount":string,"growthTrajectory":string,"splitModel":string,"techStack":string,"recentMoves":[{"title":string,"detail":string,"impact":"high"|"medium"|"low","date":string}],"recruitingStrategy":string,"agentValueProps":[string],"weaknesses":[string],"threatToKW":string,"opportunityForKW":string,"signalsToWatch":[string],"materialityScore":number}`,
  competitor:
    `You are a competitive intelligence analyst for Keller Williams' Product & Innovation team specializing in real estate CRM and PropTech. Respond ONLY with valid JSON matching this schema: {"competitor":string,"summary":string,"recentMoves":[{"title":string,"detail":string,"impact":"high"|"medium"|"low","date":string}],"strengths":[string],"weaknesses":[string],"threatToKW":string,"opportunityForKW":string,"signalsToWatch":[string],"materialityScore":number}`,
  partnership:
    `You are a technology partnership scout for Keller Williams' Product & Innovation team evaluating PropTech for integration into KW's Command platform, Marketplace, or DevHub API. Respond ONLY with valid JSON matching this schema: {"category":string,"opportunities":[{"company":string,"product":string,"description":string,"agentValueProp":string,"integrationComplexity":"low"|"medium"|"high","competitorAdoption":string,"recommendation":"pursue"|"monitor"|"pass","rationale":string}],"marketContext":string,"urgency":"high"|"medium"|"low","urgencyRationale":string}`,
  market:
    `You are a real estate technology market analyst for Keller Williams' Product & Innovation team tracking macro trends, emerging tech, and agent behavior shifts. Respond ONLY with valid JSON matching this schema: {"topic":string,"executiveSummary":string,"trends":[{"trend":string,"description":string,"timeframe":"now"|"6months"|"12months"|"24months","impact":"high"|"medium"|"low"}],"agentBehaviorSignals":[string],"implicationsForKW":[{"area":"product"|"integration"|"competitive"|"organizational","implication":string}],"recommendedActions":[{"action":string,"owner":"product"|"integrations"|"executive"|"research","priority":"immediate"|"quarter"|"halfyear"}]}`,
  briefing:
    `You are the VP of Product & Innovation's intelligence briefing system at Keller Williams. Write in a voice that is direct, analytical, and confident. Respond ONLY with valid JSON matching this schema: {"title":string,"date":string,"classification":"KW Internal — Confidential","executiveSummary":string,"materialDevelopments":[{"development":string,"detail":string,"source":string,"materialityScore":number,"recommendedResponse":string}],"competitiveLandscape":string,"partnershipPipeline":string,"risksAndThreats":[{"risk":string,"detail":string,"likelihood":"high"|"medium"|"low","impact":"high"|"medium"|"low"}],"recommendedAgenda":[string],"nextBriefingFocus":string}`,
  sentiment:
    `You are a real estate agent experience analyst at Keller Williams. You monitor what agents are saying about technology products — in app store reviews, Reddit, Facebook groups, Twitter/X, and industry forums. Analyze sentiment about the specified product or topic. Be specific about what agents love, hate, and are asking for. Respond ONLY with valid JSON matching this schema: {"product":string,"overallSentiment":"positive"|"mixed"|"negative","sentimentScore":number,"themes":[{"theme":string,"sentiment":"positive"|"negative"|"neutral","frequency":"common"|"occasional"|"rare","exampleQuotes":[string]}],"agentPainPoints":[string],"featureRequests":[string],"competitiveComparisons":[{"competitor":string,"comparison":string}],"implicationsForKW":string}`,
  funding:
    `You are a PropTech and real estate technology investment analyst at Keller Williams. Track venture funding rounds, acquisitions, mergers, SPAC activity, and public market movements in the real estate technology sector. Respond ONLY with valid JSON matching this schema: {"topic":string,"recentActivity":[{"company":string,"eventType":"funding_round"|"acquisition"|"merger"|"ipo"|"spac"|"shutdown","detail":string,"amount":string,"investors":[string],"date":string,"significance":"high"|"medium"|"low"}],"trendAnalysis":string,"implicationsForKW":string,"companiesToWatch":[{"company":string,"reason":string,"timeline":string}]}`,
};

export const MODULE_QUERIES: Record<ModuleType, (input: string) => string> = {
  smart: (input) => input,
  brokerage: (input) =>
    `Use web search to profile "${input}" as a competitor brokerage to Keller Williams. Find current agent count, growth rate, split/cap model, technology stack, recruiting messaging, and recent strategic moves.`,
  competitor: (input) =>
    `Use web search to analyze "${input}" as a competitor to Keller Williams in real estate CRM/technology. Find their latest product moves, pricing, funding, partnerships, and agent adoption trends.`,
  partnership: (input) =>
    `Use web search to identify integration and partnership opportunities in the "${input}" technology category for Keller Williams' Command platform, Marketplace, and agent ecosystem.`,
  market: (input) =>
    `Use web search to analyze the "${input}" trend in real estate technology. Find current data, market signals, and emerging developments relevant to Keller Williams.`,
  briefing: (input) =>
    `Use web search to compile an executive intelligence briefing on "${input}" for the VP of Product & Innovation at Keller Williams.`,
  sentiment: (input) =>
    `Use web search to analyze agent sentiment about "${input}". Check app store reviews, Reddit (r/realtors, r/RealEstate), Facebook groups, Twitter/X, and industry forums like ActiveRain. What are agents saying?`,
  funding: (input) =>
    `Use web search to find recent funding rounds, acquisitions, mergers, and investment activity related to "${input}" in real estate technology and PropTech.`,
};

export const MODULE_CONFIG: Record<ModuleType, { label: string; placeholder: string; description: string }> = {
  smart: {
    label: 'Smart Query',
    placeholder: 'Ask anything — mortgage rates, competitor moves, PropTech funding, agent trends...',
    description: 'General intelligence — any question about real estate, tech, or market data',
  },
  brokerage: {
    label: 'Brokerage Intel',
    placeholder: 'Enter brokerage name (e.g. eXp Realty)',
    description: 'Agent value prop, splits, tech stack & recruiting strategy',
  },
  competitor: {
    label: 'Competitor Intel',
    placeholder: 'Enter competitor name (e.g. Follow Up Boss)',
    description: 'Structured competitive profile with threat assessment',
  },
  partnership: {
    label: 'Partnership Scout',
    placeholder: 'Enter tech category (e.g. AI showing assistants)',
    description: 'Integration & partnership opportunity evaluation',
  },
  market: {
    label: 'Market Trends',
    placeholder: 'Enter trend topic (e.g. AI-powered lead scoring)',
    description: 'Market intelligence and implications for KW',
  },
  briefing: {
    label: 'Executive Briefing',
    placeholder: 'Enter briefing topic (e.g. Q2 competitive landscape)',
    description: 'C-suite ready intelligence synthesis',
  },
  sentiment: {
    label: 'Agent Sentiment',
    placeholder: 'Enter product or topic (e.g. Follow Up Boss, AI showing tools)',
    description: 'Agent reviews, forum sentiment, pain points & feature requests',
  },
  funding: {
    label: 'Funding & M&A',
    placeholder: 'Enter topic or company (e.g. PropTech AI funding, Compass)',
    description: 'PropTech funding rounds, acquisitions, M&A activity',
  },
};

export interface QuickTarget {
  label: string;
  group: string;
  module: ModuleType;
}

export const QUICK_TARGET_GROUPS = [
  'Brokerages',
  'Competitors — Tier 1',
  'Competitors — Tier 2',
  'Market Queries',
] as const;

export const QUICK_TARGETS: QuickTarget[] = [
  // Brokerages → brokerage module
  { label: 'eXp Realty', group: 'Brokerages', module: 'brokerage' },
  { label: 'Compass', group: 'Brokerages', module: 'brokerage' },
  { label: 'REAL Broker', group: 'Brokerages', module: 'brokerage' },
  // Tier 1 → competitor module
  { label: 'Follow Up Boss', group: 'Competitors — Tier 1', module: 'competitor' },
  { label: 'kvCORE / Inside Real Estate', group: 'Competitors — Tier 1', module: 'competitor' },
  { label: 'Sierra Interactive', group: 'Competitors — Tier 1', module: 'competitor' },
  { label: 'Lofty (formerly Chime)', group: 'Competitors — Tier 1', module: 'competitor' },
  { label: 'Side', group: 'Competitors — Tier 1', module: 'competitor' },
  { label: 'Propertybase (Lone Wolf)', group: 'Competitors — Tier 1', module: 'competitor' },
  // Tier 2 → competitor module
  { label: 'BoomTown', group: 'Competitors — Tier 2', module: 'competitor' },
  { label: 'LionDesk', group: 'Competitors — Tier 2', module: 'competitor' },
  { label: 'Wise Agent', group: 'Competitors — Tier 2', module: 'competitor' },
  { label: 'Realvolve', group: 'Competitors — Tier 2', module: 'competitor' },
  { label: 'Rechat', group: 'Competitors — Tier 2', module: 'competitor' },
  { label: 'Real Geeks', group: 'Competitors — Tier 2', module: 'competitor' },
  // Market Queries → smart mode
  { label: 'Current mortgage rate trends and forecast', group: 'Market Queries', module: 'smart' },
  { label: 'Housing inventory and supply analysis', group: 'Market Queries', module: 'smart' },
  { label: 'Home price trends — national and Austin TX', group: 'Market Queries', module: 'smart' },
  { label: 'PropTech funding activity this quarter', group: 'Market Queries', module: 'smart' },
  { label: 'Agent sentiment on AI-powered CRM tools', group: 'Market Queries', module: 'smart' },
  { label: 'MLS and NAR policy changes affecting technology', group: 'Market Queries', module: 'smart' },
];
