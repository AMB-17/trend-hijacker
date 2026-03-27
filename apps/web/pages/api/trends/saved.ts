import type { NextApiRequest, NextApiResponse } from 'next'
import { listSavedTrends, saveTrend } from '../_demo-store'

function parseNumber(value: unknown, fallback: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(String(raw ?? fallback), 10)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userIdParam = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId
  const userId = String(userIdParam || '').trim()
  if (!userId) {
    return res.status(400).json({ success: false, error: { message: 'Missing userId query param' } })
  }

  if (req.method === 'GET') {
    const limit = parseNumber(req.query.limit, 50, 1, 200)
    const offset = parseNumber(req.query.offset, 0, 0, 10000)
    const payload = listSavedTrends(userId, limit, offset)

    return res.status(200).json({
      success: true,
      data: payload.data,
      meta: {
        total: payload.total,
        hasMore: payload.hasMore,
        limit,
        offset,
      },
    })
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'object' && req.body ? req.body : {}
    const trendId = String((body as any).trendId || '').trim()
    if (!trendId) {
      return res.status(400).json({ success: false, error: { message: 'Missing trendId in request body' } })
    }

    const saved = saveTrend(userId, trendId)
    if (!saved) {
      return res.status(404).json({ success: false, error: { message: 'Trend not found' } })
    }

    return res.status(201).json({ success: true, data: saved })
  }

  return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
}
