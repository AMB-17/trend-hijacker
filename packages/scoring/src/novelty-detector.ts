import { daysSince } from "@packages/utils";

/**
 * Calculate novelty score for a topic
 *
 * Higher score for:
 * - Recently discovered topics  * - Topics with rapid growth despite newness
 *
 * Returns score from 0-1
 */
export function calculateNoveltyScore(firstSeenDate: Date, totalMentions: number): number {
  const ageInDays = daysSince(firstSeenDate);

  // Recency score: decays over 30 days
  const recencyScore = Math.max(0, 1 - ageInDays / 30);

  // Volume score: normalized, caps at 100 mentions
  const volumeScore = Math.min(1, totalMentions / 100);

  // Weight recency more heavily (70%) than volume (30%)
  return recencyScore * 0.7 + volumeScore * 0.3;
}

/**
 * Check if a topic is "new" (first seen within last N days)
 */
export function isNewTopic(firstSeenDate: Date, thresholdDays: number = 7): boolean {
  return daysSince(firstSeenDate) <= thresholdDays;
}

/**
 * Check if a topic is experiencing "early growth"
 * (new topic with rapidly increasing mentions)
 */
export function isEarlyGrowth(
  firstSeenDate: Date,
  currentMentions: number,
  growthRate: number
): boolean {
  const isNew = isNewTopic(firstSeenDate, 14); // Within last 2 weeks
  const hasVolume = currentMentions >= 10; // At least 10 mentions
  const isGrowing = growthRate >= 0.5; // At least 50% growth

  return isNew && hasVolume && isGrowing;
}

/**
 * Calculate "freshness" score based on recent activity
 * Higher score for topics with recent activity vs old activity
 */
export function calculateFreshnessScore(
  recentMentions: number, // last 24h
  totalMentions: number
): number {
  if (totalMentions === 0) return 0;

  const ratio = recentMentions / totalMentions;

  // If more than 30% of mentions are recent, it's fresh.
  return Math.min(1, ratio * 3);
}

/**
 * Detect "breakout" topics - suddenly popular after being dormant
 */
export function isBreakoutTopic(
  firstSeenDate: Date,
  recentMentions: number,
  historicalAverage: number
): boolean {
  const ageInDays = daysSince(firstSeenDate);

  // Topic must be at least 7 days old
  if (ageInDays < 7) return false;

  // Recent activity must be significantly higher than historical average
  const spike = recentMentions / (historicalAverage || 1);

  return spike >= 3.0; // 3x the historical average
}
