import type { NextApiRequest, NextApiResponse } from 'next'

function parseNumber(value: unknown, fallback: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(String(raw ?? fallback), 10)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  const limit = parseNumber(req.query.limit, 50, 1, 200)
  const offset = parseNumber(req.query.offset, 0, 0, 10000)

  return res.status(200).json({
    success: true,
    data: [],
    meta: {
      total: 0,
      limit,
      offset,
      hasMore: false,
    },
  })
}
