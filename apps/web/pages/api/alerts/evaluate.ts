import type { NextApiRequest, NextApiResponse } from 'next'
import { evaluateAlerts } from '../_demo-store'

function parseLimit(value: unknown, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(String(raw ?? fallback), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, 100)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  const userIdParam = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId
  const userId = String(userIdParam || '').trim()
  if (!userId) {
    return res.status(400).json({ success: false, error: { message: 'Missing userId query param' } })
  }

  const limit = parseLimit(req.query.limit, 20)
  const data = evaluateAlerts(userId, limit)

  return res.status(200).json({
    success: true,
    data,
    meta: {
      evaluated: data.length,
      limit,
    },
  })
}
