import { FastifyInstance } from "fastify";
import { SearchQuerySchema, SearchSuggestionsQuerySchema } from "@packages/types";
import { searchService } from "../services/search.service";

export default async function searchRoutes(app: FastifyInstance) {
  // GET /api/search - Search trends
  app.get("/", async (request, reply) => {
    const parsed = SearchQuerySchema.safeParse(request.query ?? {});
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

    const { q, limit } = parsed.data;

    const results = await searchService.searchTrends(q, limit);

    return {
      success: true,
      data: results,
      meta: {
        query: q,
        count: results.length,
      },
    };
  });

  // GET /api/search/posts - Search posts
  app.get("/posts", async (request, reply) => {
    const parsed = SearchQuerySchema.safeParse(request.query ?? {});
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

    const { q, limit } = parsed.data;

    const results = await searchService.searchPosts(q, limit);

    return {
      success: true,
      data: results,
      meta: {
        query: q,
        count: results.length,
      },
    };
  });

  // GET /api/search/suggestions - Get search suggestions
  app.get("/suggestions", async (request, reply) => {
    const parsed = SearchSuggestionsQuerySchema.safeParse(request.query ?? {});
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

    const { q, limit } = parsed.data;

    if (!q) {
      // Return popular searches if no query
      const popular = await searchService.getPopularSearches(limit);
      return {
        success: true,
        data: popular,
      };
    }

    const suggestions = await searchService.getSuggestions(q, limit);

    return {
      success: true,
      data: suggestions,
    };
  });
}
