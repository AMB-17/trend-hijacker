import type { OpportunityScoreComponents } from "@packages/types";
import { clamp } from "@packages/utils";

/**
 * Calculate opportunity score using weighted formula:
 * score = velocity_growth * 0.35 + problem_intensity * 0.30 + discussion_volume * 0.20 + novelty_score * 0.15
 *
 * All components should be normalized to 0-1 range
 * Returns score from 0-100
 */
export function calculateOpportunityScore(components: OpportunityScoreComponents): number {
  const {
    velocityGrowth, //  0-1
    problemIntensity, // 0-1
    discussionVolume, // 0-1
    noveltyScore, // 0-1
  } = components;

  // Ensure all components are in valid range
  const weights = {
    velocity: 0.35,
    problem: 0.30,
    volume: 0.20,
    novelty: 0.15,
  };

  const normalizedVelocity = clamp(velocityGrowth, 0, 1);
  const normalizedProblem = clamp(problemIntensity, 0, 1);
  const normalizedVolume = clamp(discussionVolume, 0, 1);
  const normalizedNovelty = clamp(noveltyScore, 0, 1);

  const rawScore =
    normalizedVelocity * weights.velocity +
    normalizedProblem * weights.problem +
    normalizedVolume * weights.volume +
    normalizedNovelty * weights.novelty;

  // Convert to 0-100 scale
  return Math.round(rawScore * 100);
}

/**
 * Normalize discussion volume to 0-1 scale
 * Uses logarithmic scaling for better distribution
 */
export function normalizeDiscussionVolume(volume: number, maxVolume: number = 1000): number {
  if (volume <= 0) return 0;
  if (volume >= maxVolume) return 1;

  // Use logarithmic scale to handle wide range of volumes
  const logVolume = Math.log10(volume + 1);
  const logMax = Math.log10(maxVolume + 1);

  return clamp(logVolume / logMax, 0, 1);
}

/**
 * Normalize velocity growth rate to 0-1 scale
 * Growth rate can be any positive number (e.g., 2.5 = 250% growth)
 */
export function normalizeVelocityGrowth(growthRate: number, maxGrowth: number = 5.0): number {
  if (growthRate <= 0) return 0;
  if (growthRate >= maxGrowth) return 1;

  return clamp(growthRate / maxGrowth, 0, 1);
}

/**
 * Calculate overall score and determine stage
 */
export function calculateStage(opportunityScore: number, growthRate: number): string {
  if (opportunityScore >= 75 && growthRate >= 2.0) {
    return "exploding";
  } else if (opportunityScore >= 60) {
    return "emerging";
  } else if (opportunityScore >= 40 && growthRate >= 1.5) {
    return "early_signal";
  } else {
    return "mature";
  }
}

/**
 * Determine market potential based on score components
 */
export function assessMarketPotential(
  opportunityScore: number,
  discussionVolume: number,
  problemIntensity: number
): "low" | "medium" | "high" {
  if (opportunityScore >= 70 && problemIntensity >= 0.7) {
    return "high";
  } else if (opportunityScore >= 50 || (discussionVolume >= 0.6 && problemIntensity >= 0.6)) {
    return "medium";
  } else {
    return "low";
  }
}
