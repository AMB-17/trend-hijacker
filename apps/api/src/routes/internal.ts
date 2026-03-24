import { FastifyInstance } from "fastify";
import { timingSafeEqual } from "crypto";
import { runIngestionBatch } from "../services/batch-ingestion.service";
import { runProcessingBatch } from "../services/batch-processing.service";

type DiscussionSource = "reddit" | "hackernews" | "producthunt" | "indiehackers" | "rss";

const REQUEST_TTL_MS = 10 * 60 * 1000;
const inFlightRoutes = new Set<string>();
const inFlightRequestKeys = new Set<string>();
const completedRequestKeys = new Map<string, number>();

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

  // Use timing-safe comparison to prevent timing attacks
  const secretBuffer = Buffer.from(requestSecret);
  const expectedBuffer = Buffer.from(secretFromEnv);

  // Check lengths match to prevent timing attacks on length comparison
  if (secretBuffer.length !== expectedBuffer.length) {
    return false;
  }

  try {
    return timingSafeEqual(secretBuffer, expectedBuffer);
  } catch {
    // timingSafeEqual throws if buffers have different lengths (defensive check)
    return false;
  }
}

function normalizeHeaderValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

function toOptionalNumber(value: unknown, min?: number, max?: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  if (typeof min === "number" && value < min) {
    return undefined;
  }

  if (typeof max === "number" && value > max) {
    return undefined;
  }

  return value;
}

function cleanupCompletedKeys(now: number): void {
  for (const [key, expiresAt] of completedRequestKeys.entries()) {
    if (expiresAt <= now) {
      completedRequestKeys.delete(key);
    }
  }
}

function beginCronRequest(routeName: string, idempotencyKey: string | undefined): { ok: true } | { ok: false; statusCode: number; message: string } {
  const now = Date.now();
  cleanupCompletedKeys(now);

  if (inFlightRoutes.has(routeName)) {
    return { ok: false, statusCode: 429, message: "A cron run is already in progress for this endpoint" };
  }

  if (idempotencyKey) {
    if (inFlightRequestKeys.has(idempotencyKey) || completedRequestKeys.has(idempotencyKey)) {
      return { ok: false, statusCode: 409, message: "Duplicate idempotency key" };
    }
    inFlightRequestKeys.add(idempotencyKey);
  }

  inFlightRoutes.add(routeName);
  return { ok: true };
}

function finishCronRequest(routeName: string, idempotencyKey: string | undefined): void {
  inFlightRoutes.delete(routeName);

  if (!idempotencyKey) {
    return;
  }

  inFlightRequestKeys.delete(idempotencyKey);
  completedRequestKeys.set(idempotencyKey, Date.now() + REQUEST_TTL_MS);
}

export default async function internalRoutes(app: FastifyInstance) {
  app.post("/cron/ingest", async (request, reply) => {
    const secret = process.env.CRON_SECRET;
    const requestSecret = request.headers["x-cron-secret"];

    if (!assertAuthorized(secret, requestSecret)) {
      reply.code(401);
      return { success: false, error: { message: "Unauthorized" } };
    }

    const idempotencyKey = normalizeHeaderValue(request.headers["x-idempotency-key"]);
    const begin = beginCronRequest("cron-ingest", idempotencyKey);
    if (!begin.ok) {
      reply.code(begin.statusCode);
      return { success: false, error: { message: begin.message } };
    }

    try {
      const body = (request.body as { sources?: unknown; limitPerSource?: unknown } | undefined) ?? {};
      const sources = parseSources(body.sources);
      const limitPerSource = toOptionalNumber(body.limitPerSource, 1, 200);

      const result = await runIngestionBatch({
        sources,
        limitPerSource,
      });

      return {
        success: true,
        data: result,
      };
    } finally {
      finishCronRequest("cron-ingest", idempotencyKey);
    }
  });

  app.post("/cron/process", async (request, reply) => {
    const secret = process.env.CRON_SECRET;
    const requestSecret = request.headers["x-cron-secret"];

    if (!assertAuthorized(secret, requestSecret)) {
      reply.code(401);
      return { success: false, error: { message: "Unauthorized" } };
    }

    const idempotencyKey = normalizeHeaderValue(request.headers["x-idempotency-key"]);
    const begin = beginCronRequest("cron-process", idempotencyKey);
    if (!begin.ok) {
      reply.code(begin.statusCode);
      return { success: false, error: { message: begin.message } };
    }

    try {
      const body = (request.body as { hoursBack?: unknown; maxTrends?: unknown; minMentions?: unknown } | undefined) ?? {};
      const hoursBack = toOptionalNumber(body.hoursBack, 1, 168);
      const maxTrends = toOptionalNumber(body.maxTrends, 1, 1000);
      const minMentions = toOptionalNumber(body.minMentions, 1, 1000);

      const result = await runProcessingBatch({
        hoursBack,
        maxTrends,
        minMentions,
      });

      return {
        success: true,
        data: result,
      };
    } finally {
      finishCronRequest("cron-process", idempotencyKey);
    }
  });

  app.post("/cron/run-all", async (request, reply) => {
    const secret = process.env.CRON_SECRET;
    const requestSecret = request.headers["x-cron-secret"];

    if (!assertAuthorized(secret, requestSecret)) {
      reply.code(401);
      return { success: false, error: { message: "Unauthorized" } };
    }

    const idempotencyKey = normalizeHeaderValue(request.headers["x-idempotency-key"]);
    const begin = beginCronRequest("cron-run-all", idempotencyKey);
    if (!begin.ok) {
      reply.code(begin.statusCode);
      return { success: false, error: { message: begin.message } };
    }

    try {
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
        limitPerSource: toOptionalNumber(body.limitPerSource, 1, 200),
      });

      const processing = await runProcessingBatch({
        hoursBack: toOptionalNumber(body.hoursBack, 1, 168),
        maxTrends: toOptionalNumber(body.maxTrends, 1, 1000),
        minMentions: toOptionalNumber(body.minMentions, 1, 1000),
      });

      return {
        success: true,
        data: {
          ingestion,
          processing,
        },
      };
    } finally {
      finishCronRequest("cron-run-all", idempotencyKey);
    }
  });
}
