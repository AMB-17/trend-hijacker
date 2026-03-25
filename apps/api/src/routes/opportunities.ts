import { FastifyInstance } from "fastify";
import { LimitQuerySchema } from "@packages/types";
import { opportunityMapService } from "../services/opportunity-map.service";
import { errorResponse, successResponse } from "../utils/api-response";

export default async function opportunitiesRoutes(app: FastifyInstance) {
  // GET /api/opportunities - Get opportunity map data
  app.get("/", async (request, reply) => {
    const mapData = await opportunityMapService.getOpportunityMap();

    return successResponse(mapData);
  });

  // GET /api/opportunities/quick-wins - Get quick wins
  app.get("/quick-wins", async (request, reply) => {
    const parsed = LimitQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorResponse(request, "Invalid query parameters", "INVALID_QUERY_PARAMETERS", parsed.error.flatten());
    }

    const quickWins = await opportunityMapService.getQuickWins(parsed.data.limit);

    return successResponse(quickWins);
  });

  // GET /api/opportunities/insights - Get opportunity insights
  app.get("/insights", async (request, reply) => {
    const insights = await opportunityMapService.getOpportunityInsights();

    return successResponse(insights);
  });
}
