export * from "./trend.types";
export * from "./post.types";
export * from "./api.types";
export * from "./queue.types";
export * from "./scraper.types";

// Also export validation schemas from root
export * from "../schemas";

// Re-export types from root index for compatibility
export type { User, Trend, Discussion, TrendDiscussion, TrendMetric, PainPoint, OpportunityIdea, TrendResponse, ScrapeTask, ProcessingTask, VelocityData, TrendOpportunityScoringInput, TrendOpportunityScoringOutput, Feature, FeatureSet } from "../index";
export { TIER_FEATURES } from "../index";
