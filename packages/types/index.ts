// Shared types for TREND HIJACKER

export * from './schemas';
export * from './src/trend.types';
export * from './src/post.types';
export * from './src/api.types';
export * from './src/queue.types';
export * from './src/scraper.types';

export type TierType = 'free' | 'premium' | 'enterprise';

export interface User {
  id: string;
  email: string;
  tier: TierType;
  createdAt: Date;
  updatedAt: Date;
}

export interface Trend {
  id: string;
  title: string;
  summary: string;
  opportunityScore: number;
  velocityScore: number;
  problemIntensity: number;
  noveltyScore: number;
  discussionCount: number;
  sourceCount: number;
  status: 'emerging' | 'growing' | 'peak' | 'declining' | 'stable';
  category?: string;
  suggestedIdeas: string[];
  marketPotentialEstimate?: string;
  peakDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Discussion {
  id: string;
  source: 'reddit' | 'hackernews' | 'producthunt' | 'indiehackers' | 'rss';
  sourceId: string;
  url: string;
  title?: string;
  content: string;
  author?: string;
  upvotes: number;
  commentsCount: number;
  sentimentScore?: number;
  extractedKeywords: string[];
  painPointsDetected: boolean;
  createdAt: Date;
  fetchedAt: Date;
}

export interface TrendDiscussion {
  trendId: string;
  discussionId: string;
  relevanceScore: number;
}

export interface TrendMetric {
  id: string;
  trendId: string;
  timestamp: Date;
  mentionCount: number;
  velocity: number;
  acceleration: number;
  sentimentAvg?: number;
  createdAt: Date;
}

export interface PainPoint {
  id: string;
  trendId: string;
  patternPhrase: string;
  matchCount: number;
  intensity: number;
  lastSeen: Date;
  createdAt: Date;
}

export interface OpportunityIdea {
  type: 'startup' | 'saas' | 'content' | 'product';
  title: string;
  description: string;
  targetAudience: string;
  difficulty: 'low' | 'medium' | 'high';
  potentialMarketSize?: string;
}

export interface TrendResponse extends Trend {
  discussions: Discussion[];
  painPoints: PainPoint[];
  metrics: TrendMetric[];
  ideas: OpportunityIdea[];
}

export interface ScrapeTask {
  id: string;
  source: 'reddit' | 'hackernews' | 'producthunt' | 'indiehackers' | 'rss';
  cursor?: string;
  priority: 'low' | 'medium' | 'high';
  retries: number;
  maxRetries: number;
  createdAt: Date;
}

export interface ProcessingTask {
  id: string;
  discussions: Discussion[];
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface VelocityData {
  date: string;
  mentionCount: number;
  velocity: number;
  acceleration: number;
}

export interface TrendOpportunityScoringInput {
  velocityGrowth: number;
  problemIntensity: number;
  discussionVolume: number;
  noveltyScore: number;
}

export interface TrendOpportunityScoringOutput {
  opportunityScore: number;
  breakdown: {
    velocityGrowth: number;
    problemIntensity: number;
    discussionVolume: number;
    noveltyScore: number;
  };
}

export type Feature = 
  | 'unlimited_trends'
  | 'early_signals'
  | 'opportunity_generator'
  | 'opportunity_map'
  | 'webhooks'
  | 'api_access'
  | 'custom_sources';

export type FeatureSet = {
  [key in Feature]?: boolean;
};

export const TIER_FEATURES: Record<TierType, FeatureSet> = {
  free: {
    unlimited_trends: false,
    early_signals: false,
    opportunity_generator: false,
  },
  premium: {
    unlimited_trends: true,
    early_signals: true,
    opportunity_generator: true,
    opportunity_map: true,
  },
  enterprise: {
    unlimited_trends: true,
    early_signals: true,
    opportunity_generator: true,
    opportunity_map: true,
    webhooks: true,
    api_access: true,
    custom_sources: true,
  },
};
