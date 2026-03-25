import { FastifyInstance } from "fastify";
import { z } from "zod";
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
import { ideaGenerationService } from "../services/idea-generation.service";
import { trendInsightsService } from "../services/trend-insights.service";
import { errorResponse, successResponse } from "../utils/api-response";

// Validation schemas
const GenerateIdeasRequestSchema = z.object({
  userId: z.string().min(1),
  numberOfIdeas: z.number().int().min(1).max(5).default(3),
});

const AddIdeaFeedbackSchema = z.object({
  userId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().optional(),
});

export default async function trendsRoutes(app: FastifyInstance) {
  // GET /api/trends - List all trends
  app.get("/", async (request, reply) => {
    const parsed = TrendsListQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorResponse(request, "Invalid query parameters", "INVALID_QUERY_PARAMETERS", parsed.error.flatten());
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

    return successResponse(trends.data, {
        total: trends.total,
        limit,
        offset,
        hasMore: trends.hasMore,
      });
  });

  // GET /api/trends/saved - List saved trends for a user
  app.get("/saved", async (request, reply) => {
    const parsed = SavedTrendsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorResponse(request, "Invalid query parameters", "INVALID_QUERY_PARAMETERS", parsed.error.flatten());
    }

    const { userId, limit, offset } = parsed.data;
    const result = await savedTrendService.listSavedTrends(userId, limit, offset);

    return successResponse(result.data, {
        total: result.total,
        limit,
        offset,
        hasMore: result.hasMore,
      });
  });

  // POST /api/trends/saved - Save a trend for a user
  app.post("/saved", async (request, reply) => {
    const parsed = SaveTrendInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorResponse(request, "Invalid request body", "INVALID_REQUEST_BODY", parsed.error.flatten());
    }

    const { userId, trendId } = parsed.data;
    const saved = await savedTrendService.saveTrend(userId, trendId);

    if (!saved) {
      reply.code(404);
      return errorResponse(request, "Trend not found", "TREND_NOT_FOUND");
    }

    return successResponse({
        userId,
        trendId,
        savedAt: saved.savedAt,
      });
  });

  // DELETE /api/trends/saved/:trendId?userId=... - Remove saved trend for a user
  app.delete("/saved/:trendId", async (request, reply) => {
    const parsedParams = RemoveSavedTrendParamsSchema.safeParse(request.params ?? {});
    const parsedQuery = RemoveSavedTrendQuerySchema.safeParse(request.query ?? {});

    if (!parsedParams.success || !parsedQuery.success) {
      reply.code(400);
      return errorResponse(request, "Invalid request parameters", "INVALID_REQUEST_PARAMETERS", {
        params: parsedParams.success ? undefined : parsedParams.error.flatten(),
        query: parsedQuery.success ? undefined : parsedQuery.error.flatten(),
      });
    }

    const { trendId } = parsedParams.data;
    const { userId } = parsedQuery.data;

    const removed = await savedTrendService.removeSavedTrend(userId, trendId);
    if (!removed) {
      reply.code(404);
      return errorResponse(request, "Saved trend not found", "SAVED_TREND_NOT_FOUND");
    }

    return successResponse({
        userId,
        trendId,
        removed: true,
      });
  });

  // GET /api/trends/top/topics - Get trending topics
  app.get("/top/topics", async (request, reply) => {
    const parsed = LimitQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorResponse(request, "Invalid query parameters", "INVALID_QUERY_PARAMETERS", parsed.error.flatten());
    }

    const topics = await trendService.getTrendingTopics(parsed.data.limit);

    return successResponse(topics);
  });

  // GET /api/trends/:id - Get trend by ID
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const trend = await trendService.getTrendById(id);

    if (!trend) {
      reply.code(404);
      return errorResponse(request, "Trend not found", "TREND_NOT_FOUND");
    }

    return successResponse(trend);
  });

  // ============================================
  // FEATURE 1: AI-Powered Idea Generator Routes
  // ============================================

  // POST /api/trends/:trendId/generate-ideas - Generate startup ideas
  app.post("/:trendId/generate-ideas", async (request, reply) => {
    const { trendId } = request.params as { trendId: string };
    const parsed = GenerateIdeasRequestSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      reply.code(400);
      return errorResponse(
        request,
        "Invalid request body",
        "INVALID_REQUEST_BODY",
        parsed.error.flatten()
      );
    }

    const trend = await trendService.getTrendById(trendId);
    if (!trend) {
      reply.code(404);
      return errorResponse(request, "Trend not found", "TREND_NOT_FOUND");
    }

    const { userId, numberOfIdeas } = parsed.data;

    try {
      const ideas = await ideaGenerationService.generateIdeas({
        trendId,
        userId,
        numberOfIdeas,
        trendTitle: trend.title,
        trendSummary: trend.summary,
      });

      return successResponse(ideas);
    } catch (error) {
      reply.code(500);
      return errorResponse(
        request,
        "Failed to generate ideas",
        "IDEA_GENERATION_FAILED"
      );
    }
  });

  // GET /api/trends/:trendId/ideas - Get generated ideas for a trend
  app.get("/:trendId/ideas", async (request, reply) => {
    const { trendId } = request.params as { trendId: string };
    const { limit = 10 } = request.query as { limit?: number };

    try {
      const ideas = await ideaGenerationService.getIdeasForTrend(trendId, limit);
      return successResponse(ideas);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Failed to fetch ideas", "FETCH_IDEAS_FAILED");
    }
  });

  // POST /api/trends/:trendId/ideas/:ideaId/feedback - Rate an idea
  app.post("/:trendId/ideas/:ideaId/feedback", async (request, reply) => {
    const { ideaId } = request.params as { ideaId: string };
    const parsed = AddIdeaFeedbackSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      reply.code(400);
      return errorResponse(
        request,
        "Invalid request body",
        "INVALID_REQUEST_BODY",
        parsed.error.flatten()
      );
    }

    const { userId, rating, feedback } = parsed.data;

    try {
      await ideaGenerationService.addFeedback(ideaId, userId, rating, feedback);
      return successResponse({ ideaId, userId, rating, feedback });
    } catch (error) {
      reply.code(500);
      return errorResponse(
        request,
        "Failed to add feedback",
        "FEEDBACK_FAILED"
      );
    }
  });

  // ============================================
  // FEATURE 5: AI-Powered Insights Routes
  // ============================================

  // GET /api/trends/:trendId/insights - Get AI insights for a trend
  app.get("/:trendId/insights", async (request, reply) => {
    const { trendId } = request.params as { trendId: string };

    const trend = await trendService.getTrendById(trendId);
    if (!trend) {
      reply.code(404);
      return errorResponse(request, "Trend not found", "TREND_NOT_FOUND");
    }

    try {
      const insights = await trendInsightsService.generateInsights(trendId, {
        title: trend.title,
        summary: trend.summary,
        keywords: trend.keywords || [],
      });

      return successResponse(insights);
    } catch (error) {
      reply.code(500);
      return errorResponse(
        request,
        "Failed to generate insights",
        "INSIGHTS_GENERATION_FAILED"
      );
    }
  });

  // GET /api/trends/:trendId/sentiment - Get sentiment analysis for a trend
  app.get("/:trendId/sentiment", async (request, reply) => {
    const { trendId } = request.params as { trendId: string };

    try {
      const sentimentHistory = await trendInsightsService.getSentimentHistory(
        trendId,
        30
      );

      if (sentimentHistory.length === 0) {
        // Generate sentiment from posts if not cached
        const trend = await trendService.getTrendById(trendId);
        if (!trend) {
          reply.code(404);
          return errorResponse(request, "Trend not found", "TREND_NOT_FOUND");
        }

        // Get posts for this trend from database
        const posts = await trendService.getTrendPosts(trendId, 10);
        const sentiment = await trendInsightsService.analyzeSentiment(
          trendId,
          posts.map(p => ({
            title: p.title,
            content: p.content,
          }))
        );

        return successResponse({
          current: sentiment,
          history: [sentiment],
        });
      }

      return successResponse({
        current: sentimentHistory[sentimentHistory.length - 1],
        history: sentimentHistory,
      });
    } catch (error) {
      reply.code(500);
      return errorResponse(
        request,
        "Failed to get sentiment data",
        "SENTIMENT_FAILED"
      );
    }
  });

  // GET /api/trends/:trendId/tags - Get AI-generated tags for a trend
  app.get("/:trendId/tags", async (request, reply) => {
    const { trendId } = request.params as { trendId: string };

    const trend = await trendService.getTrendById(trendId);
    if (!trend) {
      reply.code(404);
      return errorResponse(request, "Trend not found", "TREND_NOT_FOUND");
    }

    try {
      const tags = await trendInsightsService.generateTags(trendId, {
        title: trend.title,
        summary: trend.summary,
        keywords: trend.keywords || [],
      });

      return successResponse(tags);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Failed to generate tags", "TAGS_FAILED");
    }
  });

  // GET /api/trends/:trendId/sub-trends - Get detected sub-trends
  app.get("/:trendId/sub-trends", async (request, reply) => {
    const { trendId } = request.params as { trendId: string };

    try {
      const subTrends = await trendInsightsService.getSubTrendsForTrend(trendId);
      return successResponse(subTrends);
    } catch (error) {
      reply.code(500);
      return errorResponse(
        request,
        "Failed to get sub-trends",
        "SUB_TRENDS_FAILED"
      );
    }
  });
}
