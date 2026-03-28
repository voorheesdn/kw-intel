export type ModuleType =
  | 'smart'
  | 'competitor'
  | 'brokerage'
  | 'partnership'
  | 'market'
  | 'briefing'
  | 'sentiment'
  | 'funding';

export type ImpactLevel = 'high' | 'medium' | 'low';

// ─── Smart Query ──────────────────────────────────────────────────────────────

export interface SmartData {
  queryType: 'competitive' | 'market_data' | 'economic' | 'industry' | 'partnership' | 'briefing' | 'general';
  title: string;
  executiveSummary: string;
  findings: Array<{
    finding: string;
    detail: string;
    source: string;
    significance: ImpactLevel;
    timeframe: string;
  }>;
  implications: Array<{
    area: string;
    implication: string;
    urgency: 'immediate' | 'quarter' | 'halfyear' | 'monitor';
  }>;
  bottomLine: string;
  recommendedActions: Array<{
    action: string;
    owner: 'product' | 'integrations' | 'executive' | 'research';
    priority: 'immediate' | 'quarter' | 'halfyear';
  }>;
}

// ─── Competitor ───────────────────────────────────────────────────────────────

export interface CompetitorData {
  competitor: string;
  summary: string;
  recentMoves: Array<{
    title: string;
    detail: string;
    impact: ImpactLevel;
    date: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  threatToKW: string;
  opportunityForKW: string;
  signalsToWatch: string[];
  materialityScore: number;
}

// ─── Brokerage ────────────────────────────────────────────────────────────────

export interface BrokerageData {
  brokerage: string;
  summary: string;
  agentCount: string;
  growthTrajectory: string;
  splitModel: string;
  techStack: string;
  recentMoves: Array<{
    title: string;
    detail: string;
    impact: ImpactLevel;
    date: string;
  }>;
  recruitingStrategy: string;
  agentValueProps: string[];
  weaknesses: string[];
  threatToKW: string;
  opportunityForKW: string;
  signalsToWatch: string[];
  materialityScore: number;
}

// ─── Partnership ──────────────────────────────────────────────────────────────

export interface PartnershipData {
  category: string;
  opportunities: Array<{
    company: string;
    product: string;
    description: string;
    agentValueProp: string;
    integrationComplexity: ImpactLevel;
    competitorAdoption: string;
    recommendation: 'pursue' | 'monitor' | 'pass';
    rationale: string;
  }>;
  marketContext: string;
  urgency: ImpactLevel;
  urgencyRationale: string;
}

// ─── Market ───────────────────────────────────────────────────────────────────

export interface MarketData {
  topic: string;
  executiveSummary: string;
  trends: Array<{
    trend: string;
    description: string;
    timeframe: 'now' | '6months' | '12months' | '24months';
    impact: ImpactLevel;
  }>;
  agentBehaviorSignals: string[];
  implicationsForKW: Array<{
    area: 'product' | 'integration' | 'competitive' | 'organizational';
    implication: string;
  }>;
  recommendedActions: Array<{
    action: string;
    owner: 'product' | 'integrations' | 'executive' | 'research';
    priority: 'immediate' | 'quarter' | 'halfyear';
  }>;
}

// ─── Briefing ─────────────────────────────────────────────────────────────────

export interface BriefingData {
  title: string;
  date: string;
  classification: string;
  executiveSummary: string;
  materialDevelopments: Array<{
    development: string;
    detail: string;
    source: string;
    materialityScore: number;
    recommendedResponse: string;
  }>;
  competitiveLandscape: string;
  partnershipPipeline: string;
  risksAndThreats: Array<{
    risk: string;
    detail: string;
    likelihood: ImpactLevel;
    impact: ImpactLevel;
  }>;
  recommendedAgenda: string[];
  nextBriefingFocus: string;
}

// ─── Agent Sentiment ──────────────────────────────────────────────────────────

export interface SentimentData {
  product: string;
  overallSentiment: 'positive' | 'mixed' | 'negative';
  sentimentScore: number;
  themes: Array<{
    theme: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    frequency: 'common' | 'occasional' | 'rare';
    exampleQuotes: string[];
  }>;
  agentPainPoints: string[];
  featureRequests: string[];
  competitiveComparisons: Array<{
    competitor: string;
    comparison: string;
  }>;
  implicationsForKW: string;
}

// ─── Funding & M&A ────────────────────────────────────────────────────────────

export interface FundingData {
  topic: string;
  recentActivity: Array<{
    company: string;
    eventType: 'funding_round' | 'acquisition' | 'merger' | 'ipo' | 'spac' | 'shutdown';
    detail: string;
    amount: string;
    investors: string[];
    date: string;
    significance: ImpactLevel;
  }>;
  trendAnalysis: string;
  implicationsForKW: string;
  companiesToWatch: Array<{
    company: string;
    reason: string;
    timeline: string;
  }>;
}

export type IntelData =
  | SmartData
  | CompetitorData
  | BrokerageData
  | PartnershipData
  | MarketData
  | BriefingData
  | SentimentData
  | FundingData;
