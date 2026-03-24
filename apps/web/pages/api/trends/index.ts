import type { NextApiRequest, NextApiResponse } from 'next'
import { DEMO_TRENDS_EARLY, DEMO_TRENDS_EXPLODING } from '../_lib/demo-data'

type TrendRecord = {
  id: string
  title: string
  summary: string
  opportunityScore: number
  velocityGrowth: number
  problemIntensity: number
  discussionVolume: number
  noveltyScore: number
  status: string
  stage: string
  firstDetected: string
  lastUpdated: string
  growthRate: number
  momentum: string
  suggestedIdeas?: string[]
  targetAudience?: string
  marketPotential?: string
  keywords: string[]
}

const DEMO_TRENDS: TrendRecord[] = [...DEMO_TRENDS_EARLY, ...DEMO_TRENDS_EXPLODING].map((trend) => ({
  ...trend,
  status: trend.status === 'VALIDATED' ? 'ACTIVE' : trend.status,
}))

function parseNumber(value: unknown, fallback: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(String(raw ?? fallback), 10)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

function toQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim()
  }

  if (typeof value === 'string') {
    return value.trim()
  }

  return undefined
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  const stage = toQueryValue(req.query.stage)
  const requestedStatus = toQueryValue(req.query.status)
  const status = requestedStatus === 'VALIDATED' ? 'ACTIVE' : requestedStatus
  const minScoreRaw = toQueryValue(req.query.minScore)
  const minScore = minScoreRaw ? Number.parseFloat(minScoreRaw) : undefined
  const sortBy = toQueryValue(req.query.sortBy) || 'score'
  const limit = parseNumber(req.query.limit, 20, 1, 200)
  const offset = parseNumber(req.query.offset, 0, 0, 10000)

  let trends = DEMO_TRENDS.slice()

  if (stage) {
    trends = trends.filter((trend) => trend.stage === stage)
  }

  if (status) {
    trends = trends.filter((trend) => trend.status === status)
  }

  if (Number.isFinite(minScore)) {
    trends = trends.filter((trend) => trend.opportunityScore >= (minScore as number))
  }

  trends.sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.firstDetected).getTime() - new Date(a.firstDetected).getTime()
    }

    if (sortBy === 'velocity') {
      return b.velocityGrowth - a.velocityGrowth
    }

    if (sortBy === 'volume') {
      return b.discussionVolume - a.discussionVolume
    }

    return b.opportunityScore - a.opportunityScore
  })

  const total = trends.length
  const paginated = trends.slice(offset, offset + limit)

  return res.status(200).json({
    success: true,
    data: paginated,
    meta: {
      total,
      limit,
      offset,
      hasMore: offset + paginated.length < total,
    },
  })
}
