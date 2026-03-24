import { FastifyInstance } from "fastify";
import { LimitQuerySchema, TrendsListQuerySchema } from "@packages/types";
import { trendService } from "../services/trend.service";

export default async function trendsRoutes(app: FastifyInstance) {
  // GET /api/trends - List all trends
  app.get("/", async (request, reply) => {
    const parsed = TrendsListQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return {
        success: false,
        error: {
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
      };
    }

    const { stage, status, minScore, sortBy, limit, offset } = parsed.data;
    const normalizedStatus = status === "VALIDATED" ? "ACTIVE" : status;

    const trends = await trendService.getTrends({
      stage,
      status: normalizedStatus,
      minScore,
      sortBy,
      limit,
      offset,
    });

    return {
      success: true,
      data: trends.data,
      meta: {
        total: trends.total,
        limit,
        offset,
        hasMore: trends.hasMore,
      },
    };
  });

  // GET /api/trends/top/topics - Get trending topics
  app.get("/top/topics", async (request, reply) => {
    const parsed = LimitQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return {
        success: false,
        error: {
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
      };
    }

    const topics = await trendService.getTrendingTopics(parsed.data.limit);

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
