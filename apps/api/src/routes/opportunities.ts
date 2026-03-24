import { FastifyInstance } from "fastify";
import { LimitQuerySchema } from "@packages/types";
import { opportunityMapService } from "../services/opportunity-map.service";

export default async function opportunitiesRoutes(app: FastifyInstance) {
  // GET /api/opportunities - Get opportunity map data
  app.get("/", async (request, reply) => {
    const mapData = await opportunityMapService.getOpportunityMap();

    return {
      success: true,
      data: mapData,
    };
  });

  // GET /api/opportunities/quick-wins - Get quick wins
  app.get("/quick-wins", async (request, reply) => {
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

    const quickWins = await opportunityMapService.getQuickWins(parsed.data.limit);

    return {
      success: true,
      data: quickWins,
    };
  });

  // GET /api/opportunities/insights - Get opportunity insights
  app.get("/insights", async (request, reply) => {
    const insights = await opportunityMapService.getOpportunityInsights();

    return {
      success: true,
      data: insights,
    };
  });
}
