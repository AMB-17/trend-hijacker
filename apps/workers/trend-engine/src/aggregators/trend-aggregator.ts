import { PrismaClient } from "@packages/database";
import { logger } from "@packages/utils";
import { TrendOpportunity } from "../layers/opportunity-scoring";

export interface AggregatedTrend {
  title: string;
  summary: string;
  keyword: string;
  opportunityScore: number;
  velocityGrowth: number;
  problemIntensity: number;
  discussionVolume: number;
  noveltyScore: number;
  status: "EMERGING" | "VALIDATED" | "DECLINING";
  stage: string;
  postIds: string[];
  confidence: number;
}

/**
 * Trend Aggregator
 * Groups related posts into trends and generates summaries
 */
export class TrendAggregator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create or update trends from opportunities
   */
  async aggregateTrends(
    opportunities: TrendOpportunity[]
  ): Promise<AggregatedTrend[]> {
    const trends: AggregatedTrend[] = [];

    for (const opp of opportunities) {
      try {
        const trend = await this.createOrUpdateTrend(opp);
        if (trend) {
          trends.push(trend);
        }
      } catch (error) {
        logger.error(
          `[TrendAggregator] Error creating trend for "${opp.keyword}":`,
          error instanceof Error ? error.message : error
        );
      }
    }

    logger.info(
      `[TrendAggregator] Created/updated ${trends.length} trends`
    );

    return trends;
  }

  /**
   * Create or update a trend in the database
   */
  private async createOrUpdateTrend(
    opportunity: TrendOpportunity
  ): Promise<AggregatedTrend | null> {
    try {
      // Check if trend already exists for this keyword
      const existing = await this.prisma.trend.findFirst({
        where: {
          keywords: {
            has: opportunity.keyword,
          },
        },
        include: {
          posts: {
            include: {
              post: true,
            },
          },
        },
      });

      // Generate title and summary
      const title = this.generateTitle(opportunity.keyword);
      const summary = this.generateSummary(opportunity);

      // Determine status
      const status = this.determineStatus(opportunity);

      if (existing) {
        // Update existing trend
        const updated = await this.prisma.trend.update({
          where: { id: existing.id },
          data: {
            opportunityScore: opportunity.opportunityScore,
            velocityGrowth: opportunity.components.velocityGrowth,
            problemIntensity: opportunity.components.problemIntensity,
            discussionVolume: Math.round(
              opportunity.components.discussionVolume * 100
            ),
            noveltyScore: opportunity.components.noveltyScore,
            stage: opportunity.stage,
            status: status,
            lastDetected: new Date(),
            summary: summary, // Update summary with new data
          },
          include: {
            posts: {
              include: {
                post: true,
              },
            },
          },
        });

        // Add new posts that aren't already linked
        await this.linkPostsToTrend(updated.id, opportunity.relatedPosts);

        logger.info(
          `[TrendAggregator] Updated trend "${opportunity.keyword}" (score: ${opportunity.opportunityScore})`
        );

        return this.mapToAggregatedTrend(updated, opportunity);
      } else {
        // Create new trend
        const created = await this.prisma.trend.create({
          data: {
            title,
            summary,
            keywords: [opportunity.keyword],
            opportunityScore: opportunity.opportunityScore,
            velocityGrowth: opportunity.components.velocityGrowth,
            problemIntensity: opportunity.components.problemIntensity,
            discussionVolume: Math.round(
              opportunity.components.discussionVolume * 100
            ),
            noveltyScore: opportunity.components.noveltyScore,
            stage: opportunity.stage,
            status: status,
            firstSeen: new Date(),
            lastDetected: new Date(),
          },
          include: {
            posts: {
              include: {
                post: true,
              },
            },
          },
        });

        // Link posts to trend
        await this.linkPostsToTrend(created.id, opportunity.relatedPosts);

        logger.info(
          `[TrendAggregator] Created new trend "${opportunity.keyword}" (score: ${opportunity.opportunityScore})`
        );

        return this.mapToAggregatedTrend(created, opportunity);
      }
    } catch (error) {
      logger.error(
        `[TrendAggregator] Error in createOrUpdateTrend:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Link posts to a trend
   */
  private async linkPostsToTrend(
    trendId: string,
    postIds: string[]
  ): Promise<void> {
    try {
      // Get existing links
      const existing = await this.prisma.trendPost.findMany({
        where: { trendId },
        select: { postId: true },
      });

      const existingIds = new Set(existing.map((tp) => tp.postId));

      // Add only new posts
      const newPostIds = postIds.filter((id) => !existingIds.has(id));

      if (newPostIds.length > 0) {
        await this.prisma.trendPost.createMany({
          data: newPostIds.map((postId) => ({
            trendId,
            postId,
            relevanceScore: 1.0, // Could calculate based on keyword match strength
          })),
          skipDuplicates: true,
        });

        logger.debug(
          `[TrendAggregator] Linked ${newPostIds.length} new posts to trend ${trendId}`
        );
      }
    } catch (error) {
      logger.error(
        `[TrendAggregator] Error linking posts:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Generate a human-readable title for the trend
   */
  private generateTitle(keyword: string): string {
    // Capitalize first letter of each word
    return keyword
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Generate a summary for the trend
   */
  private generateSummary(opportunity: TrendOpportunity): string {
    const { keyword, components, stage, reasoning } = opportunity;

    // Build summary parts
    const parts: string[] = [];

    // Stage description
    if (stage === "early_signal") {
      parts.push(`An early signal around "${keyword}" is emerging.`);
    } else if (stage === "exploding") {
      parts.push(
        `"${keyword}" is experiencing explosive growth in discussions.`
      );
    } else {
      parts.push(`"${keyword}" is an emerging trend gaining traction.`);
    }

    // Velocity
    if (components.velocityGrowth > 0.7) {
      parts.push("Discussions are accelerating rapidly.");
    } else if (components.velocityGrowth > 0.4) {
      parts.push("Discussion volume is growing steadily.");
    }

    // Pain
    if (components.problemIntensity > 0.6) {
      parts.push(
        "Strong pain signals indicate significant user frustration and unmet needs."
      );
    } else if (components.problemIntensity > 0.3) {
      parts.push("Users are expressing problems and seeking solutions.");
    }

    // Novelty
    if (components.noveltyScore > 0.7) {
      parts.push("This is a newly emerging topic with low competition.");
    } else if (components.noveltyScore < 0.4) {
      parts.push("This is an established space seeing renewed interest.");
    }

    // Add reasoning
    parts.push(reasoning);

    return parts.join(" ");
  }

  /**
   * Determine trend status
   */
  private determineStatus(
    opportunity: TrendOpportunity
  ): "EMERGING" | "VALIDATED" | "DECLINING" {
    const { components } = opportunity;

    // Validated: High scores across the board
    if (
      components.velocityGrowth > 0.6 &&
      components.problemIntensity > 0.5 &&
      components.discussionVolume > 0.5
    ) {
      return "VALIDATED";
    }

    // Declining: Negative or very low growth
    if (components.velocityGrowth < 0.2) {
      return "DECLINING";
    }

    // Default: Emerging
    return "EMERGING";
  }

  /**
   * Map database trend to aggregated trend
   */
  private mapToAggregatedTrend(
    dbTrend: any,
    opportunity: TrendOpportunity
  ): AggregatedTrend {
    return {
      title: dbTrend.title,
      summary: dbTrend.summary,
      keyword: opportunity.keyword,
      opportunityScore: dbTrend.opportunityScore,
      velocityGrowth: dbTrend.velocityGrowth,
      problemIntensity: dbTrend.problemIntensity,
      discussionVolume: dbTrend.discussionVolume,
      noveltyScore: dbTrend.noveltyScore,
      status: dbTrend.status,
      stage: dbTrend.stage,
      postIds: dbTrend.posts.map((tp: any) => tp.postId),
      confidence: opportunity.confidence,
    };
  }

  /**
   * Cleanup old trends that are no longer relevant
   */
  async cleanupOldTrends(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await this.prisma.trend.deleteMany({
      where: {
        AND: [
          {
            lastDetected: {
              lt: cutoffDate,
            },
          },
          {
            status: "DECLINING",
          },
        ],
      },
    });

    logger.info(
      `[TrendAggregator] Cleaned up ${result.count} old declining trends`
    );

    return result.count;
  }

  /**
   * Get top trends by opportunity score
   */
  async getTopTrends(limit: number = 50): Promise<any[]> {
    return await this.prisma.trend.findMany({
      where: {
        status: {
          in: ["EMERGING", "VALIDATED"],
        },
      },
      orderBy: {
        opportunityScore: "desc",
      },
      take: limit,
      include: {
        posts: {
          include: {
            post: {
              include: {
                source: true,
              },
            },
          },
          take: 10, // Limit posts per trend
        },
      },
    });
  }
}
