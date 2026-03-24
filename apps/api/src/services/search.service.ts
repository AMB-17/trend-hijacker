import { prisma } from "@packages/database";
import { cacheService, CacheService } from "./cache.service";
import { logger } from "@packages/utils";

export class SearchService {
  /**
   * Search trends by keyword
   * Uses PostgreSQL full-text search on title, summary, and keywords array
   */
  async searchTrends(query: string, limit: number = 20) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = CacheService.searchKey(normalizedQuery, limit);

    // Try cache first
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Search in title, summary, and keywords array
      const results = await prisma.trend.findMany({
        where: {
          AND: [
            {
              status: { in: ["EMERGING", "ACTIVE"] },
            },
            {
              OR: [
                {
                  title: {
                    contains: normalizedQuery,
                    mode: "insensitive",
                  },
                },
                {
                  summary: {
                    contains: normalizedQuery,
                    mode: "insensitive",
                  },
                },
                {
                  keywords: {
                    has: normalizedQuery, // Exact match in keywords array
                  },
                },
                {
                  keywords: {
                    hasSome: normalizedQuery.split(" "), // Match any word
                  },
                },
              ],
            },
          ],
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

      // Cache results for 5 minutes
      await cacheService.set(cacheKey, results, 300);

      logger.info(
        `[SearchService] Search "${query}": ${results.length} results`
      );

      return results;
    } catch (error) {
      logger.error(`[SearchService] Error searching for "${query}":`, error);
      throw error;
    }
  }

  /**
   * Search posts by keyword
   */
  async searchPosts(query: string, limit: number = 20) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `search:posts:${normalizedQuery}:${limit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return prisma.post.findMany({
          where: {
            AND: [
              {
                processed: true, // Only show processed posts
              },
              {
                OR: [
                  {
                    title: {
                      contains: normalizedQuery,
                      mode: "insensitive",
                    },
                  },
                  {
                    content: {
                      contains: normalizedQuery,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            ],
          },
          orderBy: [
            { engagement: "desc" }, // Higher engagement first
            { publishedAt: "desc" },
          ],
          take: limit,
          include: {
            source: {
              select: {
                name: true,
              },
            },
            painPoints: {
              take: 3,
              orderBy: {
                intensity: "desc",
              },
            },
          },
        });
      },
      300 // 5 minutes
    );
  }

  /**
   * Get search suggestions based on trending keywords
   */
  async getSuggestions(query: string, limit: number = 10) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `search:suggestions:${normalizedQuery}:${limit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get recent trends and extract keywords that match
        const trends = await prisma.trend.findMany({
          where: {
            status: { in: ["EMERGING", "ACTIVE"] },
            lastDetected: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            keywords: true,
            opportunityScore: true,
          },
          orderBy: {
            opportunityScore: "desc",
          },
          take: 200, // Get top 200 trends
        });

        // Extract and filter keywords
        const keywordSet = new Set<string>();
        for (const trend of trends) {
          for (const keyword of trend.keywords) {
            if (keyword.toLowerCase().includes(normalizedQuery)) {
              keywordSet.add(keyword);
            }
          }
        }

        // Convert to array and return top N
        return Array.from(keywordSet).slice(0, limit);
      },
      600 // 10 minutes
    );
  }

  /**
   * Advanced search with filters
   */
  async advancedSearch(params: {
    query: string;
    stage?: string;
    minScore?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }) {
    const { query, stage, minScore, dateFrom, dateTo, limit = 20 } = params;

    if (!query || query.trim().length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    try {
      const where: any = {
        AND: [
          {
            status: { in: ["EMERGING", "ACTIVE"] },
          },
          {
            OR: [
              {
                title: {
                  contains: normalizedQuery,
                  mode: "insensitive",
                },
              },
              {
                summary: {
                  contains: normalizedQuery,
                  mode: "insensitive",
                },
              },
              {
                keywords: {
                  hasSome: normalizedQuery.split(" "),
                },
              },
            ],
          },
        ],
      };

      // Add filters
      if (stage) {
        where.AND.push({ stage });
      }

      if (minScore !== undefined) {
        where.AND.push({ opportunityScore: { gte: minScore } });
      }

      if (dateFrom || dateTo) {
        const dateFilter: any = {};
        if (dateFrom) dateFilter.gte = dateFrom;
        if (dateTo) dateFilter.lte = dateTo;
        where.AND.push({ lastDetected: dateFilter });
      }

      const results = await prisma.trend.findMany({
        where,
        orderBy: {
          opportunityScore: "desc",
        },
        take: limit,
        include: {
          posts: {
            take: 3,
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

      logger.info(
        `[SearchService] Advanced search "${query}": ${results.length} results`
      );

      return results;
    } catch (error) {
      logger.error(
        `[SearchService] Error in advanced search for "${query}":`,
        error
      );
      throw error;
    }
  }

  /**
   * Get popular searches (trending keywords)
   */
  async getPopularSearches(limit: number = 10) {
    const cacheKey = `search:popular:${limit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get most common keywords from recent trends
        const trends = await prisma.trend.findMany({
          where: {
            status: { in: ["EMERGING", "ACTIVE"] },
            lastDetected: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            keywords: true,
            opportunityScore: true,
          },
          orderBy: {
            opportunityScore: "desc",
          },
          take: 100,
        });

        // Count keyword occurrences
        const keywordCounts = new Map<string, number>();
        for (const trend of trends) {
          for (const keyword of trend.keywords) {
            keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
          }
        }

        // Sort and return top N
        return Array.from(keywordCounts.entries())
          .map(([keyword, count]) => ({ keyword, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
          .map((item) => item.keyword);
      },
      3600 // 1 hour
    );
  }
}

// Export singleton instance
export const searchService = new SearchService();
