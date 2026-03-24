import type { NextApiRequest, NextApiResponse } from 'next'
import { DEMO_TRENDS_EARLY } from '../../../lib/demo-data'

function parseLimit(value: unknown, defaultValue: number): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(String(raw ?? defaultValue), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue
  return Math.min(parsed, 50)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  const limit = parseLimit(req.query.limit, 20)
  return res.status(200).json({ success: true, data: DEMO_TRENDS_EARLY.slice(0, limit) })
}
