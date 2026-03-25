import { FastifyInstance } from "fastify";
import { SearchQuerySchema, SearchSuggestionsQuerySchema } from "@packages/types";
import { searchService } from "../services/search.service";
import { errorResponse, successResponse } from "../utils/api-response";

export default async function searchRoutes(app: FastifyInstance) {
  // GET /api/search - Search trends
  app.get("/", async (request, reply) => {
    const parsed = SearchQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorResponse(request, "Invalid query parameters", "INVALID_QUERY_PARAMETERS", parsed.error.flatten());
    }

    const { q, limit } = parsed.data;

    const results = await searchService.searchTrends(q, limit);

    return successResponse(results, {
        query: q,
        count: results.length,
      });
  });

  // GET /api/search/posts - Search posts
  app.get("/posts", async (request, reply) => {
    const parsed = SearchQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorResponse(request, "Invalid query parameters", "INVALID_QUERY_PARAMETERS", parsed.error.flatten());
    }

    const { q, limit } = parsed.data;

    const results = await searchService.searchPosts(q, limit);

    return successResponse(results, {
        query: q,
        count: results.length,
      });
  });

  // GET /api/search/suggestions - Get search suggestions
  app.get("/suggestions", async (request, reply) => {
    const parsed = SearchSuggestionsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorResponse(request, "Invalid query parameters", "INVALID_QUERY_PARAMETERS", parsed.error.flatten());
    }

    const { q, limit } = parsed.data;

    if (!q) {
      // Return popular searches if no query
      const popular = await searchService.getPopularSearches(limit);
      return successResponse(popular);
    }

    const suggestions = await searchService.getSuggestions(q, limit);

    return successResponse(suggestions);
  });
}
