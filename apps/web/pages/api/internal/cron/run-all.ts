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

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
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

  try {
    const body = (req.body ?? {}) as CronRequestBody

    const ingestion = await runIngestionBatch({
      sources: parseSources(body.sources),
      limitPerSource: toOptionalNumber(body.limitPerSource),
    })

    const processing = await runProcessingBatch({
      hoursBack: toOptionalNumber(body.hoursBack),
      maxTrends: toOptionalNumber(body.maxTrends),
      minMentions: toOptionalNumber(body.minMentions),
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
  }
}
