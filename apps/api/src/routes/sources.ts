import { FastifyInstance } from "fastify";
import { prisma } from "@packages/database";
import { errorResponse, successResponse } from "../utils/api-response";

export default async function sourcesRoutes(app: FastifyInstance) {
  // GET /api/sources - Get all sources
  app.get("/", async (request, reply) => {
    const sources = await prisma.source.findMany({
      orderBy: { name: "asc" },
    });

    return successResponse(sources);
  });

  // GET /api/sources/:id/stats - Get source statistics
  app.get("/:id/stats", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [source, postCount, recentPosts] = await Promise.all([
      prisma.source.findUnique({ where: { id } }),
      prisma.post.count({ where: { sourceId: id } }),
      prisma.post.count({
        where: {
          sourceId: id,
          scrapedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
          },
        },
      }),
    ]);

    if (!source) {
      reply.code(404);
      return errorResponse(request, "Source not found", "SOURCE_NOT_FOUND");
    }

    return successResponse({
      ...source,
      totalPosts: postCount,
      recentPosts,
    });
  });
}
