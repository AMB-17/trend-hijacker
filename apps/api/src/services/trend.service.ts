import { prisma } from "@packages/database";
import type { TrendFilters } from "@packages/types";
import { cacheService, CacheService } from "./cache.service";
import { logger } from "@packages/utils";

export class TrendService {
  /**
   * Get trends with filtering, sorting, and pagination
   */
  async getTrends(filters: TrendFilters) {
    const {
      stage,
      status,
      minScore,
      sortBy = "score",
      sortOrder = "desc",
      limit = 20,
      offset = 0,
    } = filters;

    // Generate cache key
    const cacheKey = CacheService.trendKey({ stage, status, minScore, sortBy, limit, offset });

    // Try to get from cache
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build where clause
    const where: any = {};

    if (stage) where.stage = stage;
    if (status) where.status = status;
    if (minScore) where.opportunityScore = { gte: minScore };

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === "score") orderBy.opportunityScore = sortOrder;
    else if (sortBy === "date") orderBy.firstDetected = sortOrder;
    else if (sortBy === "velocity") orderBy.velocityGrowth = sortOrder;
    else if (sortBy === "volume") orderBy.discussionVolume = sortOrder;
    else orderBy.opportunityScore = "desc"; // Default

    try {
      const [trends, total] = await Promise.all([
        prisma.trend.findMany({
          where,
          orderBy,
          take: limit,
          skip: offset,
          include: {
            posts: {
              take: 3, // Include top 3 posts per trend
              include: {
                post: {
                  select: {
                    id: true,
                    title: true,
                    url: true,
                    upvotes: true,
                    comments: true,
                    publishedAt: true,
                    source: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                relevance: "desc",
              },
            },
          },
        }),
        prisma.trend.count({ where }),
      ]);

      const result = {
        data: trends,
        total,
        hasMore: offset + trends.length < total,
      };

      // Cache for 5 minutes
      await cacheService.set(cacheKey, result, 300);

      return result;
    } catch (error) {
      logger.error("[TrendService] Error getting trends:", error);
      throw error;
    }
  }

  /**
   * Get a single trend by ID with full details
   */
  async getTrendById(id: string) {
    const cacheKey = CacheService.trendByIdKey(id);

    // Try cache first
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const trend = await prisma.trend.findUnique({
        where: { id },
        include: {
          posts: {
            take: 20, // More posts for detail view
            include: {
              post: {
                include: {
                  source: true,
                  painPoints: {
                    take: 5, // Top 5 pain points per post
                    orderBy: {
                      intensity: "desc",
                    },
                  },
                },
              },
            },
            orderBy: {
              relevance: "desc",
            },
          },
        },
      });

      if (trend) {
        // Cache for 10 minutes
        await cacheService.set(cacheKey, trend, 600);
      }

      return trend;
    } catch (error) {
      logger.error(`[TrendService] Error getting trend ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get early signals (early_signal stage, high opportunity score)
   */
  async getEarlySignals(limit: number = 20): Promise<unknown[]> {
    const cacheKey = "trends:early-signals:" + limit;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return prisma.trend.findMany({
          where: {
            stage: "early_signal",
            status: { in: ["EMERGING", "ACTIVE"] },
            opportunityScore: { gte: 50 },
          },
          orderBy: {
            opportunityScore: "desc",
          },
          take: limit,
          include: {
            posts: {
              take: 2,
              include: {
                post: {
                  select: {
                    id: true,
                    title: true,
                    url: true,
                    source: { select: { name: true } },
                  },
                },
              },
            },
          },
        });
      },
      300 // 5 minutes
    );
  }

  /**
   * Get exploding trends (high velocity, high volume)
   */
  async getExplodingTrends(limit: number = 20): Promise<unknown[]> {
    const cacheKey = "trends:exploding:" + limit;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return prisma.trend.findMany({
          where: {
            stage: "exploding",
            velocityGrowth: { gte: 0.7 },
          },
          orderBy: {
            velocityGrowth: "desc",
          },
          take: limit,
          include: {
            posts: {
              take: 2,
              include: {
                post: {
                  select: {
                    id: true,
                    title: true,
                    url: true,
                    source: { select: { name: true } },
                  },
                },
              },
            },
          },
        });
      },
      300
    );
  }

  /**
   * Get trending topics (recent trends with high scores)
   */
  async getTrendingTopics(limit: number = 50) {
    const cacheKey = "trends:trending-topics:" + limit;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const trends = await prisma.trend.findMany({
          where: {
            status: { in: ["EMERGING", "ACTIVE"] },
            firstDetected: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          orderBy: {
            opportunityScore: "desc",
          },
          take: limit,
          select: {
            keywords: true,
            opportunityScore: true,
            velocityGrowth: true,
            discussionVolume: true,
          },
        });

        // Extract and aggregate keywords
        const keywordMap = new Map<string, { score: number; count: number }>();

        for (const trend of trends) {
          for (const keyword of trend.keywords) {
            if (!keywordMap.has(keyword)) {
              keywordMap.set(keyword, { score: 0, count: 0 });
            }
            const data = keywordMap.get(keyword)!;
            data.score += trend.opportunityScore;
            data.count += 1;
          }
        }

        // Convert to array and sort
        return Array.from(keywordMap.entries())
          .map(([keyword, data]) => ({
            keyword,
            score: data.score / data.count,
            count: data.count,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 30);
      },
      600 // 10 minutes
    );
  }

  /**
   * Get personalized trends for a user by prioritizing saved trends.
   */
  async getTrendsForUser(userId: string, filters: TrendFilters) {
    const { stage, status, minScore, sortBy, limit, offset } = filters;
    const cacheKey = CacheService.personalizedTrendKey(userId, {
      stage,
      status,
      minScore,
      sortBy,
      limit,
      offset,
    });

    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const [saved, user] = await Promise.all([
      prisma.savedTrend.findMany({
        where: { userId },
        select: { trendId: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      }),
    ]);

    const preferences = (user?.preferences ?? null) as {
      preferredStages?: string[];
      minOpportunityScore?: number;
    } | null;

    const effectiveStage = stage ?? (preferences?.preferredStages && preferences.preferredStages.length === 1 ? preferences.preferredStages[0] : undefined);
    const effectiveMinScore = minScore ?? preferences?.minOpportunityScore;

    const trends = await this.getTrends({
      ...filters,
      stage: effectiveStage,
      minScore: effectiveMinScore,
    });

    const savedSet = new Set(saved.map((item: { trendId: string }) => item.trendId));
    const withSavedFlag = trends.data.map((trend: any) => ({
      ...trend,
      isSaved: savedSet.has(trend.id),
    }));

    // Keep existing sort, but push saved trends to top as a personalization boost.
    withSavedFlag.sort((a: { isSaved?: boolean }, b: { isSaved?: boolean }) => Number(Boolean(b.isSaved)) - Number(Boolean(a.isSaved)));

    const result = {
      ...trends,
      data: withSavedFlag,
    };

    await cacheService.set(cacheKey, result, 180);

    return result;
  }

  /**
   * Invalidate cache for trends
   */
  async invalidateCache() {
    await cacheService.deletePattern("trends:*");
    await cacheService.deletePattern("trend:*");
    await cacheService.deletePattern("user:*:trends:*");
    logger.info("[TrendService] Cache invalidated");
  }

  /**
   * Get posts for a trend (for AI analysis)
   */
  async getTrendPosts(trendId: string, limit: number = 10) {
    try {
      const trendPosts = await prisma.trendPost.findMany({
        where: { trendId },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              content: true,
              url: true,
              upvotes: true,
              comments: true,
              publishedAt: true,
              source: { select: { name: true } },
            },
          },
        },
        orderBy: { relevance: "desc" },
        take: limit,
      });

      return trendPosts.map(tp => tp.post);
    } catch (error) {
      logger.error(`[TrendService] Error getting trend posts ${trendId}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const trendService = new TrendService();
