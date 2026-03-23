import { FastifyInstance } from "fastify";
import { searchService } from "../services/search.service";

export default async function searchRoutes(app: FastifyInstance) {
  // GET /api/search - Search trends
  app.get("/", async (request, reply) => {
    const { q, limit = 20 } = request.query as any;

    if (!q) {
      reply.code(400);
      return {
        success: false,
        error: { message: "Query parameter 'q' is required" },
      };
    }

    const results = await searchService.searchTrends(q, parseInt(limit));

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
    const { q, limit = 20 } = request.query as any;

    if (!q) {
      reply.code(400);
      return {
        success: false,
        error: { message: "Query parameter 'q' is required" },
      };
    }

    const results = await searchService.searchPosts(q, parseInt(limit));

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
    const { q, limit = 10 } = request.query as any;

    if (!q) {
      // Return popular searches if no query
      const popular = await searchService.getPopularSearches(parseInt(limit));
      return {
        success: true,
        data: popular,
      };
    }

    const suggestions = await searchService.getSuggestions(q, parseInt(limit));

    return {
      success: true,
      data: suggestions,
    };
  });
}
