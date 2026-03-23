import { PrismaClient } from "@packages/database";
import { calculateVelocity, VelocityMetrics } from "@packages/scoring";
import { logger } from "@packages/utils";

export interface VelocityTrackingResult {
  keyword: string;
  currentCount: number;
  previousCount: number;
  growthRate: number;
  acceleration: number;
  isAccelerating: boolean;
  velocityScore: number; // 0-1 normalized
}

/**
 * Layer 2: Velocity Tracking
 * Tracks how often topics are mentioned and their growth rate over time
 */
export class VelocityTrackingLayer {
  private prisma: PrismaClient;

  // Time windows for velocity calculation
  private readonly CURRENT_WINDOW_HOURS = 24; // Last 24 hours
  private readonly PREVIOUS_WINDOW_HOURS = 48; // 24-48 hours ago

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Track velocity for a list of keywords
   */
  async trackKeywords(keywords: string[]): Promise<VelocityTrackingResult[]> {
    const results: VelocityTrackingResult[] = [];

    for (const keyword of keywords) {
      const result = await this.trackKeyword(keyword);
      if (result) {
        results.push(result);
      }
    }

    logger.info(
      `[VelocityTracking] Tracked ${results.length} keywords, ${
        results.filter((r) => r.isAccelerating).length
      } are accelerating`
    );

    return results;
  }

  /**
   * Track velocity for a single keyword
   */
  async trackKeyword(
    keyword: string
  ): Promise<VelocityTrackingResult | null> {
    try {
      // Get current and previous counts
      const currentCount = await this.getKeywordCount(
        keyword,
        this.CURRENT_WINDOW_HOURS
      );
      const previousCount = await this.getKeywordCount(
        keyword,
        this.PREVIOUS_WINDOW_HOURS,
        this.CURRENT_WINDOW_HOURS
      );

      // Get historical growth rate for acceleration calculation
      const historicalGrowthRate = await this.getHistoricalGrowthRate(keyword);

      // Calculate velocity metrics
      const metrics = calculateVelocity(
        currentCount,
        previousCount,
        historicalGrowthRate
      );

      // Save velocity snapshot to database
      await this.saveVelocitySnapshot(keyword, currentCount);

      // Normalize velocity score (0-1)
      const velocityScore = this.normalizeVelocity(metrics);

      logger.debug(
        `[VelocityTracking] Keyword "${keyword}": ${currentCount} mentions (growth: ${(metrics.growthRate * 100).toFixed(1)}%)`
      );

      return {
        keyword,
        currentCount: metrics.currentCount,
        previousCount: metrics.previousCount,
        growthRate: metrics.growthRate,
        acceleration: metrics.acceleration,
        isAccelerating: metrics.isAccelerating,
        velocityScore,
      };
    } catch (error) {
      logger.error(
        `[VelocityTracking] Error tracking keyword "${keyword}":`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Get mention count for a keyword within a time window
   */
  private async getKeywordCount(
    keyword: string,
    hoursAgo: number,
    startHoursAgo: number = 0
  ): Promise<number> {
    const endTime = new Date(Date.now() - startHoursAgo * 60 * 60 * 1000);
    const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    // Search in both title and content using case-insensitive search
    const count = await this.prisma.post.count({
      where: {
        AND: [
          {
            publishedAt: {
              gte: startTime,
              lt: endTime,
            },
          },
          {
            OR: [
              {
                title: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
              {
                content: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
            ],
          },
        ],
      },
    });

    return count;
  }

  /**
   * Get historical growth rate from velocity snapshots
   */
  private async getHistoricalGrowthRate(
    keyword: string
  ): Promise<number | undefined> {
    try {
      // Get last 2 snapshots
      const snapshots = await this.prisma.velocitySnapshot.findMany({
        where: { keyword },
        orderBy: { timestamp: "desc" },
        take: 2,
      });

      if (snapshots.length < 2) {
        return undefined;
      }

      const [current, previous] = snapshots;
      if (previous.count === 0) {
        return 0;
      }

      return (current.count - previous.count) / previous.count;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Save velocity snapshot to database
   */
  private async saveVelocitySnapshot(
    keyword: string,
    count: number
  ): Promise<void> {
    try {
      await this.prisma.velocitySnapshot.create({
        data: {
          keyword,
          count,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Non-critical error, just log it
      logger.debug(
        `[VelocityTracking] Could not save snapshot for "${keyword}":`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Normalize velocity metrics to 0-1 score
   */
  private normalizeVelocity(metrics: VelocityMetrics): number {
    // Growth rate > 200% = 1.0
    // Growth rate of 100% = 0.5
    // No growth = 0
    // Negative growth = 0

    if (metrics.growthRate < 0) {
      return 0;
    }

    if (metrics.growthRate >= 2) {
      return 1;
    }

    // Linear scale: 0-200% growth maps to 0-1 score
    return metrics.growthRate / 2;
  }

  /**
   * Get top accelerating keywords
   */
  async getTopAcceleratingKeywords(
    limit: number = 20
  ): Promise<VelocityTrackingResult[]> {
    // Get all recent velocity snapshots
    const snapshots = await this.prisma.velocitySnapshot.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - this.CURRENT_WINDOW_HOURS * 60 * 60 * 1000),
        },
      },
      orderBy: { timestamp: "desc" },
    });

    // Group by keyword and calculate velocity
    const keywordMap = new Map<string, number[]>();
    for (const snapshot of snapshots) {
      if (!keywordMap.has(snapshot.keyword)) {
        keywordMap.set(snapshot.keyword, []);
      }
      keywordMap.get(snapshot.keyword)!.push(snapshot.count);
    }

    // Track all keywords
    const keywords = Array.from(keywordMap.keys());
    const results = await this.trackKeywords(keywords);

    // Sort by velocity score and return top N
    return results
      .filter((r) => r.isAccelerating && r.currentCount >= 3) // At least 3 mentions
      .sort((a, b) => b.velocityScore - a.velocityScore)
      .slice(0, limit);
  }

  /**
   * Cleanup old velocity snapshots (keep last 30 days)
   */
  async cleanupOldSnapshots(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.velocitySnapshot.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo,
        },
      },
    });

    logger.info(
      `[VelocityTracking] Cleaned up ${result.count} old snapshots`
    );

    return result.count;
  }
}
