import type { NextApiRequest, NextApiResponse } from 'next'
import { trendService } from '../../../../api/src/services/trend.service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
  const limit = Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 20

  try {
    const trends = await trendService.getExplodingTrends(limit)
    return res.status(200).json({ success: true, data: trends })
  } catch {
    // If upstream services (DB/Redis) are unavailable, keep the dashboard functional.
    return res.status(200).json({ success: true, data: [] })
  }
}
