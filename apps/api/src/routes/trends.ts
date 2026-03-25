import { FastifyInstance } from "fastify";
import {
  LimitQuerySchema,
  TrendsListQuerySchema,
  SavedTrendsQuerySchema,
  SaveTrendInputSchema,
  RemoveSavedTrendParamsSchema,
  RemoveSavedTrendQuerySchema,
} from "@packages/types";
import { trendService } from "../services/trend.service";
import { savedTrendService } from "../services/saved-trend.service";

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

    const { stage, status, minScore, sortBy, limit, offset, userId } = parsed.data;
    const normalizedStatus = status === "VALIDATED" ? "ACTIVE" : status;

    const trends = userId
      ? await trendService.getTrendsForUser(userId, {
          stage,
          status: normalizedStatus,
          minScore,
          sortBy,
          limit,
          offset,
        })
      : await trendService.getTrends({
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

  // GET /api/trends/saved - List saved trends for a user
  app.get("/saved", async (request, reply) => {
    const parsed = SavedTrendsQuerySchema.safeParse(request.query ?? {});
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

    const { userId, limit, offset } = parsed.data;
    const result = await savedTrendService.listSavedTrends(userId, limit, offset);

    return {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        limit,
        offset,
        hasMore: result.hasMore,
      },
    };
  });

  // POST /api/trends/saved - Save a trend for a user
  app.post("/saved", async (request, reply) => {
    const parsed = SaveTrendInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return {
        success: false,
        error: {
          message: "Invalid request body",
          details: parsed.error.flatten(),
        },
      };
    }

    const { userId, trendId } = parsed.data;
    const saved = await savedTrendService.saveTrend(userId, trendId);

    if (!saved) {
      reply.code(404);
      return {
        success: false,
        error: {
          message: "Trend not found",
        },
      };
    }

    return {
      success: true,
      data: {
        userId,
        trendId,
        savedAt: saved.savedAt,
      },
    };
  });

  // DELETE /api/trends/saved/:trendId?userId=... - Remove saved trend for a user
  app.delete("/saved/:trendId", async (request, reply) => {
    const parsedParams = RemoveSavedTrendParamsSchema.safeParse(request.params ?? {});
    const parsedQuery = RemoveSavedTrendQuerySchema.safeParse(request.query ?? {});

    if (!parsedParams.success || !parsedQuery.success) {
      reply.code(400);
      return {
        success: false,
        error: {
          message: "Invalid request parameters",
          details: {
            params: parsedParams.success ? undefined : parsedParams.error.flatten(),
            query: parsedQuery.success ? undefined : parsedQuery.error.flatten(),
          },
        },
      };
    }

    const { trendId } = parsedParams.data;
    const { userId } = parsedQuery.data;

    const removed = await savedTrendService.removeSavedTrend(userId, trendId);
    if (!removed) {
      reply.code(404);
      return {
        success: false,
        error: {
          message: "Saved trend not found",
        },
      };
    }

    return {
      success: true,
      data: {
        userId,
        trendId,
        removed: true,
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
