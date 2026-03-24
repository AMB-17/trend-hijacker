export * from "./opportunity-score";
export * from "./velocity-calculator";
export * from "./novelty-detector";
export * from "./market-potential";
// Re-export types for convenience
export type { OpportunityScoreComponents, VelocityMetrics } from "@packages/types";
// Re-export the novelty calculation function as detectNovelty alias
export { calculateNoveltyScore as detectNovelty } from "./novelty-detector";
