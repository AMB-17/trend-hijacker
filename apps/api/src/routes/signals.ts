import { FastifyInstance } from "fastify";
import { trendService } from "../services/trend.service";

export default async function signalsRoutes(app: FastifyInstance) {
  // GET /api/signals/early - Get early signals
  app.get("/early", async (request, reply) => {
    const { limit = 20 } = request.query as any;

    const trends = await trendService.getEarlySignals(parseInt(limit));

    return {
      success: true,
      data: trends,
    };
  });

  // GET /api/signals/exploding - Get exploding trends
  app.get("/exploding", async (request, reply) => {
    const { limit = 20 } = request.query as any;

    const trends = await trendService.getExplodingTrends(parseInt(limit));

    return {
      success: true,
      data: trends,
    };
  });
}
