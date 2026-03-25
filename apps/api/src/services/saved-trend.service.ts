import { prisma } from "@packages/database";
import { cacheService } from "./cache.service";
import { logger } from "@packages/utils";

export class SavedTrendService {
  async listSavedTrends(userId: string, limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      prisma.savedTrend.findMany({
        where: { userId },
        take: limit,
        skip: offset,
        orderBy: { savedAt: "desc" },
        include: {
          trend: {
            include: {
              posts: {
                take: 2,
                include: {
                  post: {
                    select: {
                      id: true,
                      title: true,
                      url: true,
                      upvotes: true,
                      comments: true,
                      publishedAt: true,
                      source: { select: { name: true } },
                    },
                  },
                },
                orderBy: { relevance: "desc" },
              },
            },
          },
        },
      }),
      prisma.savedTrend.count({ where: { userId } }),
    ]);

    return {
      data: items.map((item: { trend: unknown; savedAt: Date }) => ({
        ...(item.trend as Record<string, unknown>),
        savedAt: item.savedAt,
        isSaved: true,
      })),
      total,
      hasMore: offset + items.length < total,
    };
  }

  async saveTrend(userId: string, trendId: string): Promise<{ savedAt: Date } | null> {
    const trend = await prisma.trend.findUnique({ where: { id: trendId }, select: { id: true } });
    if (!trend) {
      return null;
    }

    const saved = await prisma.savedTrend.upsert({
      where: {
        userId_trendId: {
          userId,
          trendId,
        },
      },
      update: {
        savedAt: new Date(),
      },
      create: {
        userId,
        trendId,
      },
      include: {
        trend: true,
      },
    });

    await cacheService.deletePattern(`user:${userId}:trends:*`);
    logger.info(`[SavedTrendService] Saved trend ${trendId} for user ${userId}`);

    return { savedAt: saved.savedAt };
  }

  async removeSavedTrend(userId: string, trendId: string) {
    const result = await prisma.savedTrend.deleteMany({
      where: {
        userId,
        trendId,
      },
    });

    await cacheService.deletePattern(`user:${userId}:trends:*`);

    return result.count > 0;
  }
}

export const savedTrendService = new SavedTrendService();
