import { FastifyInstance } from "fastify";
import { LimitQuerySchema } from "@packages/types";
import { trendService } from "../services/trend.service";

export default async function signalsRoutes(app: FastifyInstance) {
  // GET /api/signals/early - Get early signals
  app.get("/early", async (request, reply) => {
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

    const trends = await trendService.getEarlySignals(parsed.data.limit);

    return {
      success: true,
      data: trends,
    };
  });

  // GET /api/signals/exploding - Get exploding trends
  app.get("/exploding", async (request, reply) => {
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

    const trends = await trendService.getExplodingTrends(parsed.data.limit);

    return {
      success: true,
      data: trends,
    };
  });
}
