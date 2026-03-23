import {
  calculateOpportunityScore,
  OpportunityScoreComponents,
  detectNovelty,
} from "@packages/scoring";
import { logger } from "@packages/utils";
import { VelocityTrackingResult } from "./velocity-tracking";
import { PainDetectionResult } from "./pain-detection";
import { TopicExtractionResult } from "./topic-extraction";

export interface TrendOpportunity {
  keyword: string;
  opportunityScore: number; // 0-100
  components: OpportunityScoreComponents;
  confidence: number; // 0-1, how confident we are in this opportunity
  relatedPosts: string[]; // Post IDs
  stage: "early_signal" | "emerging" | "exploding";
  reasoning: string; // Human-readable explanation
}

/**
 * Layer 4: Opportunity Scoring
 * Combines velocity, pain, and volume data to calculate opportunity scores
 */
export class OpportunityScoringLayer {
  /**
   * Calculate opportunity score for a keyword/topic
   */
  calculateOpportunity(
    keyword: string,
    velocity: VelocityTrackingResult,
    painResults: PainDetectionResult[],
    topicResults: TopicExtractionResult[],
    relatedPostIds: string[]
  ): TrendOpportunity {
    // Component 1: Velocity Growth (0-1)
    const velocityGrowth = velocity.velocityScore;

    // Component 2: Problem Intensity (0-1)
    const problemIntensity = this.calculateProblemIntensity(painResults);

    // Component 3: Discussion Volume (0-1)
    const discussionVolume = this.normalizeVolume(velocity.currentCount);

    // Component 4: Novelty Score (0-1)
    const noveltyScore = this.calculateNovelty(velocity);

    // Create components object
    const components: OpportunityScoreComponents = {
      velocityGrowth,
      problemIntensity,
      discussionVolume,
      noveltyScore,
    };

    // Calculate final score (0-100)
    const opportunityScore = calculateOpportunityScore(components);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(
      velocity,
      painResults,
      relatedPostIds.length
    );

    // Determine stage
    const stage = this.determineStage(velocity, discussionVolume);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      keyword,
      components,
      velocity,
      painResults.length
    );

    logger.debug(
      `[OpportunityScoring] "${keyword}": Score ${opportunityScore}/100 (confidence: ${(confidence * 100).toFixed(0)}%)`
    );

    return {
      keyword,
      opportunityScore,
      components,
      confidence,
      relatedPosts: relatedPostIds,
      stage,
      reasoning,
    };
  }

  /**
   * Calculate problem intensity from pain detection results
   */
  private calculateProblemIntensity(
    painResults: PainDetectionResult[]
  ): number {
    if (painResults.length === 0) {
      return 0;
    }

    // Calculate weighted average:
    // - Posts with pain points contribute their intensity
    // - Posts without pain points contribute 0
    const problemFocusedPosts = painResults.filter((r) => r.isProblemFocused);

    if (problemFocusedPosts.length === 0) {
      return 0;
    }

    const totalIntensity = problemFocusedPosts.reduce(
      (sum, result) => sum + result.overallPainIntensity,
      0
    );

    // Weight by percentage of problem-focused posts
    const problemRatio = problemFocusedPosts.length / painResults.length;

    return (totalIntensity / problemFocusedPosts.length) * problemRatio;
  }

  /**
   * Normalize discussion volume to 0-1 scale
   */
  private normalizeVolume(count: number): number {
    // Volume normalization:
    // 100+ mentions in 24h = 1.0
    // 50 mentions = 0.5
    // < 10 mentions = low score

    if (count >= 100) {
      return 1;
    }

    if (count < 10) {
      return count / 50; // Lower scores for low volume
    }

    // Linear scale from 10-100
    return (count - 10) / 90;
  }

  /**
   * Calculate novelty score
   */
  private calculateNovelty(velocity: VelocityTrackingResult): number {
    // Novelty detection:
    // - New keywords (low previous count, high current) = high novelty
    // - Breakout keywords (high growth from low base) = medium-high novelty
    // - Established keywords (high previous count) = low novelty

    const { currentCount, previousCount, isAccelerating } = velocity;

    // If previousCount is 0 or very low and currentCount is significant
    if (previousCount < 5 && currentCount >= 10) {
      return 0.9; // New emerging topic
    }

    // If previousCount is low and growth is high
    if (previousCount < 15 && isAccelerating) {
      return 0.7; // Breakout topic
    }

    // If previousCount is high, it's established
    if (previousCount > 30) {
      return 0.3; // Established topic
    }

    // Default: medium novelty
    return 0.5;
  }

  /**
   * Calculate confidence in the opportunity assessment
   */
  private calculateConfidence(
    velocity: VelocityTrackingResult,
    painResults: PainDetectionResult[],
    postCount: number
  ): number {
    let confidence = 0;

    // Factor 1: Sample size (40% weight)
    if (postCount >= 20) {
      confidence += 0.4;
    } else if (postCount >= 10) {
      confidence += 0.3;
    } else if (postCount >= 5) {
      confidence += 0.2;
    } else {
      confidence += 0.1;
    }

    // Factor 2: Pain detection (30% weight)
    const painPostsRatio = painResults.filter((r) => r.hasPainPoints).length / Math.max(1, painResults.length);
    confidence += painPostsRatio * 0.3;

    // Factor 3: Velocity strength (30% weight)
    if (velocity.isAccelerating && velocity.currentCount >= 10) {
      confidence += 0.3;
    } else if (velocity.currentCount >= 5) {
      confidence += 0.2;
    } else {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * Determine trend stage
   */
  private determineStage(
    velocity: VelocityTrackingResult,
    discussionVolume: number
  ): "early_signal" | "emerging" | "exploding" {
    // Early signal: Low volume, high growth
    if (discussionVolume < 0.3 && velocity.isAccelerating) {
      return "early_signal";
    }

    // Exploding: High volume, high growth
    if (discussionVolume >= 0.6 && velocity.growthRate > 0.5) {
      return "exploding";
    }

    // Emerging: Medium volume or medium growth
    return "emerging";
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    keyword: string,
    components: OpportunityScoreComponents,
    velocity: VelocityTrackingResult,
    painPostCount: number
  ): string {
    const reasons: string[] = [];

    // Velocity
    if (components.velocityGrowth > 0.7) {
      reasons.push(
        `${velocity.currentCount} mentions with ${(velocity.growthRate * 100).toFixed(0)}% growth`
      );
    } else if (components.velocityGrowth > 0.4) {
      reasons.push(`Growing at ${(velocity.growthRate * 100).toFixed(0)}%`);
    } else {
      reasons.push(`${velocity.currentCount} mentions`);
    }

    // Pain
    if (components.problemIntensity > 0.6) {
      reasons.push(`Strong pain signals from ${painPostCount} posts`);
    } else if (components.problemIntensity > 0.3) {
      reasons.push(`Moderate pain signals detected`);
    }

    // Volume
    if (components.discussionVolume > 0.7) {
      reasons.push("High discussion volume");
    } else if (components.discussionVolume < 0.3) {
      reasons.push("Early stage signal");
    }

    // Novelty
    if (components.noveltyScore > 0.7) {
      reasons.push("Emerging new topic");
    } else if (components.noveltyScore < 0.4) {
      reasons.push("Established topic");
    }

    return reasons.join(". ") + ".";
  }

  /**
   * Batch calculate opportunities for multiple keywords
   */
  calculateOpportunities(
    data: Array<{
      keyword: string;
      velocity: VelocityTrackingResult;
      painResults: PainDetectionResult[];
      topicResults: TopicExtractionResult[];
      relatedPostIds: string[];
    }>
  ): TrendOpportunity[] {
    const opportunities = data.map((item) =>
      this.calculateOpportunity(
        item.keyword,
        item.velocity,
        item.painResults,
        item.topicResults,
        item.relatedPostIds
      )
    );

    // Filter out low-confidence opportunities
    const filtered = opportunities.filter(
      (opp) => opp.confidence >= 0.3 && opp.opportunityScore >= 30
    );

    logger.info(
      `[OpportunityScoring] Calculated ${opportunities.length} opportunities, ${filtered.length} passed threshold`
    );

    return filtered.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }
}
