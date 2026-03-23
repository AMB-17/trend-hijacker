import { FastifyInstance } from "fastify";
import { trendService } from "../services/trend.service";
import { parsePaginationParams } from "../utils/pagination";

export default async function trendsRoutes(app: FastifyInstance) {
  // GET /api/trends - List all trends
  app.get("/", async (request, reply) => {
    const { stage, status, minScore, sortBy = "score", limit = 20, offset = 0 } = request.query as any;

    const trends = await trendService.getTrends({
      stage,
      status,
      minScore: minScore ? parseFloat(minScore) : undefined,
      sortBy,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return {
      success: true,
      data: trends.data,
      meta: {
        total: trends.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: trends.hasMore,
      },
    };
  });

  // GET /api/trends/top/topics - Get trending topics
  app.get("/top/topics", async (request, reply) => {
    const { limit = 30 } = request.query as any;

    const topics = await trendService.getTrendingTopics(parseInt(limit));

    return {
      success: true,
      data: topics,
    };
  });

  // GET /api/trends/:id - Get trend by ID
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const trend = await trendService.getTrendById(id);

    if (!trend) {
      reply.code(404);
      return { success: false, error: { message: "Trend not found" } };
    }

    return { success: true, data: trend };
  });
}
