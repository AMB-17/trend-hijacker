export interface TrendData {
  id: string;
  title: string;
  summary: string;
  opportunityScore: number;
  velocityGrowth: number;
  problemIntensity: number;
  discussionVolume: number;
  noveltyScore: number;
  status: TrendStatus;
  stage: TrendStage;
  firstDetected: Date;
  lastUpdated: Date;
  peakDate?: Date;
  growthRate: number;
  momentum: TrendMomentum;
  suggestedIdeas?: string[];
  targetAudience?: string;
  marketPotential?: MarketPotential;
}

export type TrendStatus = "EMERGING" | "ACTIVE" | "EXPLODING" | "DECLINING" | "ARCHIVED";

export type TrendStage = "early_signal" | "emerging" | "exploding" | "mature";

export type TrendMomentum = "accelerating" | "stable" | "declining";

export type MarketPotential = "low" | "medium" | "high";

export interface TrendWithPosts extends TrendData {
  posts: SimplePost[];
  topics: SimpleTopic[];
}

export interface SimpleTopic {
  id: string;
  keyword: string;
  category?: string;
}

export interface SimplePost {
  id: string;
  title: string;
  url: string;
  publishedAt: Date;
  upvotes: number;
  source: {
    name: string;
  };
}

export interface OpportunityScoreComponents {
  velocityGrowth: number; // 0-1 (normalized)
  problemIntensity: number; // 0-1 (from pain detection)
  discussionVolume: number; // 0-1 (normalized)
  noveltyScore: number; // 0-1 (how new)
}

export interface VelocityMetrics {
  currentCount: number;
  previousCount: number;
  growthRate: number;
  acceleration: number;
  isAccelerating: boolean;
}
