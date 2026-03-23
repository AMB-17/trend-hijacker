import { FastifyInstance } from "fastify";
import { runIngestionBatch } from "../services/batch-ingestion.service";
import { runProcessingBatch } from "../services/batch-processing.service";

type DiscussionSource = "reddit" | "hackernews" | "producthunt" | "indiehackers" | "rss";

function parseSources(value: unknown): DiscussionSource[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const allowedSources = new Set<DiscussionSource>(["reddit", "hackernews", "producthunt", "indiehackers", "rss"]);
  const parsed = value
    .map(item => String(item) as DiscussionSource)
    .filter(item => allowedSources.has(item));

  if (parsed.length === 0) {
    return undefined;
  }

  return parsed;
}

function assertAuthorized(secretFromEnv: string | undefined, requestSecret: unknown): boolean {
  if (!secretFromEnv) {
    return false;
  }

  if (typeof requestSecret !== "string") {
    return false;
  }

  return secretFromEnv === requestSecret;
}

export default async function internalRoutes(app: FastifyInstance) {
  app.post("/cron/ingest", async (request, reply) => {
    const secret = process.env.CRON_SECRET;
    const requestSecret = request.headers["x-cron-secret"];

    if (!assertAuthorized(secret, requestSecret)) {
      reply.code(401);
      return { success: false, error: { message: "Unauthorized" } };
    }

    const body = (request.body as { sources?: unknown; limitPerSource?: unknown } | undefined) ?? {};
    const sources = parseSources(body.sources);
    const limitPerSource = typeof body.limitPerSource === "number" ? body.limitPerSource : undefined;

    const result = await runIngestionBatch({
      sources,
      limitPerSource,
    });

    return {
      success: true,
      data: result,
    };
  });

  app.post("/cron/process", async (request, reply) => {
    const secret = process.env.CRON_SECRET;
    const requestSecret = request.headers["x-cron-secret"];

    if (!assertAuthorized(secret, requestSecret)) {
      reply.code(401);
      return { success: false, error: { message: "Unauthorized" } };
    }

    const body = (request.body as { hoursBack?: unknown; maxTrends?: unknown; minMentions?: unknown } | undefined) ?? {};
    const hoursBack = typeof body.hoursBack === "number" ? body.hoursBack : undefined;
    const maxTrends = typeof body.maxTrends === "number" ? body.maxTrends : undefined;
    const minMentions = typeof body.minMentions === "number" ? body.minMentions : undefined;

    const result = await runProcessingBatch({
      hoursBack,
      maxTrends,
      minMentions,
    });

    return {
      success: true,
      data: result,
    };
  });

  app.post("/cron/run-all", async (request, reply) => {
    const secret = process.env.CRON_SECRET;
    const requestSecret = request.headers["x-cron-secret"];

    if (!assertAuthorized(secret, requestSecret)) {
      reply.code(401);
      return { success: false, error: { message: "Unauthorized" } };
    }

    const body =
      (request.body as {
        sources?: unknown;
        limitPerSource?: unknown;
        hoursBack?: unknown;
        maxTrends?: unknown;
        minMentions?: unknown;
      } | undefined) ?? {};

    const sources = parseSources(body.sources);

    const ingestion = await runIngestionBatch({
      sources,
      limitPerSource: typeof body.limitPerSource === "number" ? body.limitPerSource : undefined,
    });

    const processing = await runProcessingBatch({
      hoursBack: typeof body.hoursBack === "number" ? body.hoursBack : undefined,
      maxTrends: typeof body.maxTrends === "number" ? body.maxTrends : undefined,
      minMentions: typeof body.minMentions === "number" ? body.minMentions : undefined,
    });

    return {
      success: true,
      data: {
        ingestion,
        processing,
      },
    };
  });
}
