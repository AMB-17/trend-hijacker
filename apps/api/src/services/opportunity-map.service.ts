import { prisma } from "@packages/database";
import { cacheService } from "./cache.service";
import { logger } from "@packages/utils";

export interface OpportunityMapItem {
  id: string;
  title: string;
  keywords: string[];
  opportunityScore: number;
  velocityGrowth: number; // X-axis: 0-1
  problemIntensity: number; // Y-axis: 0-1
  discussionVolume: number; // Bubble size
  stage: string;
  postCount: number;
}

export interface OpportunityMapData {
  items: OpportunityMapItem[];
  quadrants: {
    quickWins: OpportunityMapItem[]; // High pain, low competition
    bigBets: OpportunityMapItem[]; // High pain, high competition
    fillIns: OpportunityMapItem[]; // Low pain, low competition
    hardSlogs: OpportunityMapItem[]; // Low pain, high competition
  };
  summary: {
    total: number;
    byStage: { [key: string]: number };
    avgOpportunityScore: number;
  };
}

export class OpportunityMapService {
  /**
   * Get opportunity map data
   * Maps trends to a 2D space: velocity (X) vs problem intensity (Y)
   */
  async getOpportunityMap(): Promise<OpportunityMapData> {
    const cacheKey = "opportunitymap:main";

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get active trends
        const trends = await prisma.trend.findMany({
          where: {
            status: { in: ["EMERGING", "ACTIVE"] },
            opportunityScore: { gte: 30 }, // Only significant trends
          },
          orderBy: {
            opportunityScore: "desc",
          },
          take: 100, // Top 100 trends
          include: {
            posts: {
              select: { postId: true },
            },
          },
        });

        // Map to opportunity items
        const items: OpportunityMapItem[] = trends.map((trend: any) => ({
          id: trend.id,
          title: trend.title,
          keywords: trend.keywords,
          opportunityScore: trend.opportunityScore,
          velocityGrowth: trend.velocityGrowth,
          problemIntensity: trend.problemIntensity,
          discussionVolume: trend.discussionVolume,
          stage: trend.stage,
          postCount: trend.posts.length,
        }));

        // Categorize into quadrants
        // Quadrant logic based on velocity and problem intensity
        const quadrants = this.categorizeIntoQuadrants(items);

        // Calculate summary statistics
        const summary = {
          total: items.length,
          byStage: this.countByStage(items),
          avgOpportunityScore:
            items.reduce((sum, item) => sum + item.opportunityScore, 0) /
            items.length,
        };

        return { items, quadrants, summary };
      },
      300 // 5 minutes
    );
  }

  /**
   * Categorize trends into four quadrants
   *
   * Quadrant Matrix:
   * ┌─────────────┬─────────────┐
   * │ Quick Wins  │  Big Bets   │ High Pain
   * │ (Low Vel)   │  (High Vel) │
   * ├─────────────┼─────────────┤
   * │  Fill-Ins   │ Hard Slogs  │ Low Pain
   * │ (Low Vel)   │ (High Vel)  │
   * └─────────────┴─────────────┘
   *    Low Velocity  High Velocity
   */
  private categorizeIntoQuadrants(items: OpportunityMapItem[]) {
    const velocityThreshold = 0.5;
    const painThreshold = 0.5;

    const quickWins: OpportunityMapItem[] = [];
    const bigBets: OpportunityMapItem[] = [];
    const fillIns: OpportunityMapItem[] = [];
    const hardSlogs: OpportunityMapItem[] = [];

    for (const item of items) {
      if (item.problemIntensity >= painThreshold) {
        // High pain
        if (item.velocityGrowth >= velocityThreshold) {
          bigBets.push(item); // High pain, high velocity = Big Bets
        } else {
          quickWins.push(item); // High pain, low velocity = Quick Wins
        }
      } else {
        // Low pain
        if (item.velocityGrowth >= velocityThreshold) {
          hardSlogs.push(item); // Low pain, high velocity = Hard Slogs
        } else {
          fillIns.push(item); // Low pain, low velocity = Fill-Ins
        }
      }
    }

    // Sort each quadrant by opportunity score
    const sortByScore = (a: OpportunityMapItem, b: OpportunityMapItem) =>
      b.opportunityScore - a.opportunityScore;

    quickWins.sort(sortByScore);
    bigBets.sort(sortByScore);
    fillIns.sort(sortByScore);
    hardSlogs.sort(sortByScore);

    return { quickWins, bigBets, fillIns, hardSlogs };
  }

  /**
   * Count trends by stage
   */
  private countByStage(items: OpportunityMapItem[]): { [key: string]: number } {
    const counts: { [key: string]: number } = {
      early_signal: 0,
      emerging: 0,
      exploding: 0,
    };

    for (const item of items) {
      counts[item.stage] = (counts[item.stage] || 0) + 1;
    }

    return counts;
  }

  /**
   * Get quick wins (high pain, low competition)
   * These are the best opportunities for building solutions
   */
  async getQuickWins(limit: number = 20): Promise<OpportunityMapItem[]> {
    const cacheKey = `opportunitymap:quickwins:${limit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const trends = await prisma.trend.findMany({
          where: {
            status: { in: ["EMERGING", "ACTIVE"] },
            problemIntensity: { gte: 0.5 }, // High pain
            velocityGrowth: { lt: 0.5 }, // Low competition
            opportunityScore: { gte: 40 },
          },
          orderBy: {
            opportunityScore: "desc",
          },
          take: limit,
          include: {
            posts: {
              select: { postId: true },
            },
          },
        });

        return trends.map((trend: any) => ({
          id: trend.id,
          title: trend.title,
          keywords: trend.keywords,
          opportunityScore: trend.opportunityScore,
          velocityGrowth: trend.velocityGrowth,
          problemIntensity: trend.problemIntensity,
          discussionVolume: trend.discussionVolume,
          stage: trend.stage,
          postCount: trend.posts.length,
        }));
      },
      300 // 5 minutes
    );
  }

  /**
   * Get opportunity insights and recommendations
   */
  async getOpportunityInsights() {
    const cacheKey = "opportunitymap:insights";

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const mapData = await this.getOpportunityMap();

        return {
          topQuickWin: mapData.quadrants.quickWins[0] || null,
          topBigBet: mapData.quadrants.bigBets[0] || null,
          mostDiscussed: mapData.items.sort(
            (a, b) => b.discussionVolume - a.discussionVolume
          )[0],
          fastestGrowing: mapData.items.sort(
            (a, b) => b.velocityGrowth - a.velocityGrowth
          )[0],
          recommendations: this.generateRecommendations(mapData),
        };
      },
      600 // 10 minutes
    );
  }

  /**
   * Generate insights and recommendations
   */
  private generateRecommendations(mapData: OpportunityMapData): string[] {
    const recommendations: string[] = [];

    // Quick Wins recommendation
    if (mapData.quadrants.quickWins.length > 0) {
      const topQuickWin = mapData.quadrants.quickWins[0];
      recommendations.push(
        `Build in "${topQuickWin.keywords[0]}" space - high pain (${(topQuickWin.problemIntensity * 100).toFixed(0)}%), low competition, opportunity score: ${topQuickWin.opportunityScore}`
      );
    }

    // Big Bets recommendation
    if (mapData.quadrants.bigBets.length > 0 && mapData.quadrants.bigBets[0].opportunityScore >= 70) {
      const topBigBet = mapData.quadrants.bigBets[0];
      recommendations.push(
        `Consider "${topBigBet.keywords[0]}" - exploding market with ${(topBigBet.velocityGrowth * 100).toFixed(0)}% growth, but expect competition`
      );
    }

    // Volume insight
    const highVolume = mapData.items.filter((item) => item.discussionVolume > 50);
    if (highVolume.length > 0) {
      recommendations.push(
        `${highVolume.length} trends have high discussion volume (50+ mentions) - validated demand`
      );
    }

    // Stage distribution
    if (mapData.summary.byStage.early_signal > 5) {
      recommendations.push(
        `${mapData.summary.byStage.early_signal} early signals detected - first-mover advantage opportunities`
      );
    }

    return recommendations;
  }

  /**
   * Invalidate opportunity map cache
   */
  async invalidateCache() {
    await cacheService.deletePattern("opportunitymap:*");
    logger.info("[OpportunityMapService] Cache invalidated");
  }
}

// Export singleton instance
export const opportunityMapService = new OpportunityMapService();
