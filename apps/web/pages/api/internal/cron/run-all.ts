import type { NextApiRequest, NextApiResponse } from 'next'
import { runIngestionBatch } from '../../../../../api/src/services/batch-ingestion.service'
import { runProcessingBatch } from '../../../../../api/src/services/batch-processing.service'

type DiscussionSource = 'reddit' | 'hackernews' | 'producthunt' | 'indiehackers' | 'rss'

interface CronRequestBody {
  sources?: unknown
  limitPerSource?: unknown
  hoursBack?: unknown
  maxTrends?: unknown
  minMentions?: unknown
}

const REQUEST_TTL_MS = 10 * 60 * 1000
const inFlightRoutes = new Set<string>()
const inFlightRequestKeys = new Set<string>()
const completedRequestKeys = new Map<string, number>()

function parseSources(value: unknown): DiscussionSource[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const allowedSources = new Set<DiscussionSource>([
    'reddit',
    'hackernews',
    'producthunt',
    'indiehackers',
    'rss',
  ])

  const parsed = value
    .map(item => String(item) as DiscussionSource)
    .filter(item => allowedSources.has(item))

  return parsed.length > 0 ? parsed : undefined
}

function toOptionalNumber(value: unknown, min?: number, max?: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (typeof min === 'number' && value < min) return undefined
  if (typeof max === 'number' && value > max) return undefined
  return value
}

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

function cleanupCompletedKeys(now: number): void {
  for (const [key, expiresAt] of completedRequestKeys.entries()) {
    if (expiresAt <= now) {
      completedRequestKeys.delete(key)
    }
  }
}

function beginCronRequest(routeName: string, idempotencyKey: string | undefined): { ok: true } | { ok: false; statusCode: number; message: string } {
  const now = Date.now()
  cleanupCompletedKeys(now)

  if (inFlightRoutes.has(routeName)) {
    return { ok: false, statusCode: 429, message: 'A cron run is already in progress for this endpoint' }
  }

  if (idempotencyKey) {
    if (inFlightRequestKeys.has(idempotencyKey) || completedRequestKeys.has(idempotencyKey)) {
      return { ok: false, statusCode: 409, message: 'Duplicate idempotency key' }
    }
    inFlightRequestKeys.add(idempotencyKey)
  }

  inFlightRoutes.add(routeName)
  return { ok: true }
}

function finishCronRequest(routeName: string, idempotencyKey: string | undefined): void {
  inFlightRoutes.delete(routeName)

  if (!idempotencyKey) return

  inFlightRequestKeys.delete(idempotencyKey)
  completedRequestKeys.set(idempotencyKey, Date.now() + REQUEST_TTL_MS)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  const expectedSecret = process.env.CRON_SECRET
  const receivedSecret = req.headers['x-cron-secret']

  if (!expectedSecret || typeof receivedSecret !== 'string' || receivedSecret !== expectedSecret) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } })
  }

  const idempotencyKey = normalizeHeaderValue(req.headers['x-idempotency-key'])
  const begin = beginCronRequest('cron-run-all', idempotencyKey)
  if (!begin.ok) {
    return res.status(begin.statusCode).json({ success: false, error: { message: begin.message } })
  }

  try {
    const body = (req.body ?? {}) as CronRequestBody

    const ingestion = await runIngestionBatch({
      sources: parseSources(body.sources),
      limitPerSource: toOptionalNumber(body.limitPerSource, 1, 200),
    })

    const processing = await runProcessingBatch({
      hoursBack: toOptionalNumber(body.hoursBack, 1, 168),
      maxTrends: toOptionalNumber(body.maxTrends, 1, 1000),
      minMentions: toOptionalNumber(body.minMentions, 1, 1000),
    })

    return res.status(200).json({
      success: true,
      data: {
        ingestion,
        processing,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const isDatabaseUnavailable = /ECONNREFUSED|DATABASE_URL|ENOTFOUND|ETIMEDOUT|ECONNRESET/i.test(message)

    if (isDatabaseUnavailable) {
      return res.status(200).json({
        success: true,
        data: {
          ingestion: {
            totalImported: 0,
            sourceBreakdown: {
              reddit: 0,
              hackernews: 0,
              producthunt: 0,
              indiehackers: 0,
              rss: 0,
            },
            discussionSourceIds: [],
            skipped: true,
            reason: message,
          },
          processing: {
            scannedDiscussions: 0,
            createdTrends: 0,
            processedAt: new Date().toISOString(),
            skipped: true,
            reason: message,
          },
        },
      })
    }

    return res.status(500).json({ success: false, error: { message } })
  } finally {
    finishCronRequest('cron-run-all', idempotencyKey)
  }
}
