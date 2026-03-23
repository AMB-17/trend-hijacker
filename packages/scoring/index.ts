/**
 * Opportunity Scoring System for TREND HIJACKER
 * Calculates opportunity scores based on multiple factors
 */

export interface ScoringInput {
  velocityGrowth: number; // 0-1: How fast is this trending
  problemIntensity: number; // 0-1: How intense is the problem
  discussionVolume: number; // 0-1: How much discussion (normalized)
  noveltyScore: number; // 0-1: How novel/new is this
}

export interface ScoringOutput {
  opportunityScore: number; // 0-100
  components: {
    velocityGrowth: number;
    problemIntensity: number;
    discussionVolume: number;
    noveltyScore: number;
  };
  recommendation: 'high_priority' | 'medium_priority' | 'low_priority' | 'monitor';
}

/**
 * Calculate overall opportunity score
 * Formula: velocity_growth * 0.35 + problem_intensity * 0.30 + discussion_volume * 0.20 + novelty_score * 0.15
 */
export function calculateOpportunityScore(input: ScoringInput): ScoringOutput {
  // Normalize inputs (ensure 0-1)
  const normalized = {
    velocityGrowth: Math.min(1, Math.max(0, input.velocityGrowth)),
    problemIntensity: Math.min(1, Math.max(0, input.problemIntensity)),
    discussionVolume: Math.min(1, Math.max(0, input.discussionVolume)),
    noveltyScore: Math.min(1, Math.max(0, input.noveltyScore)),
  };

  // Weights (must sum to 1.0)
  const weights = {
    velocityGrowth: 0.35,
    problemIntensity: 0.30,
    discussionVolume: 0.20,
    noveltyScore: 0.15,
  };

  const score =
    normalized.velocityGrowth * weights.velocityGrowth +
    normalized.problemIntensity * weights.problemIntensity +
    normalized.discussionVolume * weights.discussionVolume +
    normalized.noveltyScore * weights.noveltyScore;

  const opportunityScore = Math.round(score * 100);

  // Determine recommendation
  let recommendation: ScoringOutput['recommendation'] = 'low_priority';
  if (opportunityScore >= 75) {
    recommendation = 'high_priority';
  } else if (opportunityScore >= 50) {
    recommendation = 'medium_priority';
  } else if (opportunityScore >= 30) {
    recommendation = 'monitor';
  }

  return {
    opportunityScore,
    components: {
      velocityGrowth: normalized.velocityGrowth,
      problemIntensity: normalized.problemIntensity,
      discussionVolume: normalized.discussionVolume,
      noveltyScore: normalized.noveltyScore,
    },
    recommendation,
  };
}

/**
 * Calculate velocity from mention counts over time
 */
export function calculateVelocity(mentions: number[]): number {
  if (mentions.length < 2) return 0;

  // Calculate rate of change
  const diffs: number[] = [];
  for (let i = 1; i < mentions.length; i++) {
    diffs.push(mentions[i] - mentions[i - 1]);
  }

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const baseline = mentions[0] || 1;

  // Normalize from 0-1 (consider 100% growth as 1.0)
  return Math.min(1, Math.abs(avgDiff) / baseline);
}

/**
 * Calculate acceleration (2nd derivative)
 */
export function calculateAcceleration(mentions: number[]): number {
  if (mentions.length < 3) return 0;

  const diffs: number[] = [];
  for (let i = 1; i < mentions.length; i++) {
    diffs.push(mentions[i] - mentions[i - 1]);
  }

  const secondDiffs: number[] = [];
  for (let i = 1; i < diffs.length; i++) {
    secondDiffs.push(diffs[i] - diffs[i - 1]);
  }

  const avgSecondDiff = secondDiffs.reduce((a, b) => a + b, 0) / secondDiffs.length;

  return Math.min(1, Math.max(-1, avgSecondDiff / (mentions[0] || 1)));
}

/**
 * Normalize mention count to 0-1 scale with logarithmic scaling
 */
export function normalizeMentionCount(count: number, maxExpected: number = 10000): number {
  // Use log scale to compress large numbers
  const logCount = Math.log1p(count);
  const logMax = Math.log1p(maxExpected);

  return Math.min(1, logCount / logMax);
}

/**
 * Calculate novelty score based on recency
 * Newer trends get higher novelty scores
 */
export function calculateNoveltyScore(
  firstMentionDate: Date,
  currentDate: Date = new Date()
): number {
  const ageInDays = (currentDate.getTime() - firstMentionDate.getTime()) / (1000 * 60 * 60 * 24);

  // Trends older than 30 days are considered established
  if (ageInDays > 30) return 0.1;
  if (ageInDays > 14) return 0.3;
  if (ageInDays > 7) return 0.5;
  if (ageInDays > 3) return 0.7;

  // Very new trends (< 3 days) have high novelty
  return Math.min(1, 1 - ageInDays / 3);
}

/**
 * Calculate seasonality adjustment
 * Dampens scores for known seasonal patterns
 */
export function calculateSeasonalityAdjustment(trendTitle: string, date: Date): number {
  const month = date.getMonth();
  const dayOfWeek = date.getDay();

  // Lower weekend activity
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 1.1; // Boost weekend signals (they're rarer)
  }

  // Holiday dampening (rough)
  if (month === 11) return 0.9; // December - holidays
  if (month === 0) return 0.95; // January - aftermath

  return 1.0;
}

/**
 * Calculate problem intensity based on sentiment context
 */
export function calculateProblemIntensity(
  sentimentContexts: { text: string; sentiment: number }[],
  painPointCount: number
): number {
  if (sentimentContexts.length === 0) return 0;

  // Average negative sentiment where pain points are mentioned
  const negativeContext = sentimentContexts.filter(c => c.sentiment < -0.2);
  const avgNegativeSentiment = negativeContext.length > 0
    ? Math.abs(negativeContext.reduce((a, c) => a + c.sentiment, 0) / negativeContext.length)
    : 0;

  // Combine sentiment intensity with pain point frequency
  const sentimentFactor = Math.min(1, avgNegativeSentiment * 1.5);
  const painPointFactor = Math.min(1, painPointCount / 10);

  return (sentimentFactor * 0.6 + painPointFactor * 0.4);
}

/**
 * Detect if a trend is in early stage (for early signal detection)
 */
export function isEarlySignal(params: {
  ageInDays: number;
  velocity: number;
  acceleration: number;
  discussionCount: number;
}): boolean {
  const { ageInDays, velocity, acceleration, discussionCount } = params;

  // Early signal criteria:
  // - Very new (< 5 days)
  // - Accelerating growth (positive acceleration)
  // - Not yet mainstream (< 100 mentions)
  // - Strong velocity increase
  return (
    ageInDays < 5 &&
    acceleration > 0.1 &&
    discussionCount < 100 &&
    velocity > 0.2
  );
}

/**
 * Calculate market potential estimate
 */
export function estimateMarketPotential(
  discussionCount: number,
  problemIntensity: number
): 'small' | 'medium' | 'large' | 'huge' {
  const potentialScore = discussionCount * problemIntensity;

  if (potentialScore > 500) return 'huge';
  if (potentialScore > 200) return 'large';
  if (potentialScore > 50) return 'medium';

  return 'small';
}

/**
 * Calculate trend decay (how fast it's losing relevance)
 */
export function calculateTrendDecay(
  recentMentions: number,
  previousMentions: number
): number {
  if (previousMentions === 0) return 0;

  const decayRate = (previousMentions - recentMentions) / previousMentions;

  return Math.min(1, Math.max(0, decayRate));
}
