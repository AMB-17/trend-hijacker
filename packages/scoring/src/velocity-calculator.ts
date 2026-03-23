import type { VelocityMetrics } from "@packages/types";

export interface VelocityCalculatorOptions {
  timeWindow?: number; // in hours
  smoothing?: boolean;
}

/**
 * Calculate velocity metrics for a keyword/topic
 */
export function calculateVelocity(
  currentCount: number,
  previousCount: number,
  options?: VelocityCalculatorOptions
): VelocityMetrics {
  const timeWindow = options?.timeWindow || 24;

  // Prevent division by zero
  const safePreviousCount = previousCount || 1;

  // Calculate growth rate (percentage change)
  const growthRate = (currentCount - previousCount) / safePreviousCount;

  // Calculate acceleration (not available without historical data)
  // In real implementation, this would compare current growth rate with previous period
  const acceleration = growthRate > 0 ? growthRate : 0;

  const isAccelerating = growthRate > 0.5; // 50% growth threshold

  return {
    currentCount,
    previousCount,
    growthRate,
    acceleration,
    isAccelerating,
  };
}

/**
 * Detect unusual velocity spikes
 * Returns true if velocity is >2 standard deviations above mean
 */
export function isVelocitySpike(
  currentCount: number,
  historicalCounts: number[]
): boolean {
  if (historicalCounts.length < 3) return false;

  const mean = historicalCounts.reduce((sum, count) => sum + count, 0) / historicalCounts.length;
  const variance =
    historicalCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) /
    historicalCounts.length;
  const standardDeviation = Math.sqrt(variance);

  return currentCount > mean + 2 * standardDeviation;
}

/**
 * Detect sustained growth (3+ consecutive increases)
 */
export function hasSustainedGrowth(counts: number[]): boolean {
  if (counts.length < 4) return false;

  let consecutiveIncreases = 0;

  for (let i = 1; i < counts.length; i++) {
    if (counts[i] > counts[i - 1]) {
      consecutiveIncreases++;
      if (consecutiveIncreases >= 3) {
        return true;
      }
    } else {
      consecutiveIncreases = 0;
    }
  }

  return false;
}

/**
 * Calculate compound growth rate across multiple periods
 */
export function calculateCompoundGrowthRate(counts: number[]): number {
  if (counts.length < 2) return 0;

  const firstCount = counts[0] || 1;
  const lastCount = counts[counts.length - 1];

  const periods = counts.length - 1;
  const growthRate = Math.pow(lastCount / firstCount, 1 / periods) - 1;

  return growthRate;
}

/**
 * Smooth velocity data using moving average
 */
export function smoothVelocity(counts: number[], windowSize: number = 3): number[] {
  if (counts.length < windowSize) return counts;

  const smoothed: number[] = [];

  for (let i = 0; i < counts.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(counts.length, i + Math.floor(windowSize / 2) + 1);
    const window = counts.slice(start, end);
    const average = window.reduce((sum, count) => sum + count, 0) / window.length;
    smoothed.push(average);
  }

  return smoothed;
}

/**
 * Determine momentum based on velocity trends
 */
export function calculateMomentum(recentGrowthRates: number[]): "accelerating" | "stable" | "declining" {
  if (recentGrowthRates.length < 2) return "stable";

  const latestGrowth = recentGrowthRates[recentGrowthRates.length - 1];
  const avgGrowth = recentGrowthRates.reduce((sum, rate) => sum + rate, 0) / recentGrowthRates.length;

  if (latestGrowth > avgGrowth * 1.2) {
    return "accelerating";
  } else if (latestGrowth < avgGrowth * 0.8) {
    return "declining";
  } else {
    return "stable";
  }
}
