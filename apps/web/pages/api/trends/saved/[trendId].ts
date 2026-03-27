import type { NextApiRequest, NextApiResponse } from 'next'
import { removeSavedTrend } from '../../_demo-store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  const trendIdParam = Array.isArray(req.query.trendId) ? req.query.trendId[0] : req.query.trendId
  const userIdParam = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId
  const trendId = String(trendIdParam || '').trim()
  const userId = String(userIdParam || '').trim()

  if (!trendId || !userId) {
    return res.status(400).json({ success: false, error: { message: 'Missing trendId or userId' } })
  }

  const removed = removeSavedTrend(userId, trendId)
  if (!removed) {
    return res.status(404).json({ success: false, error: { message: 'Saved trend not found' } })
  }

  return res.status(200).json({ success: true, data: { removed: true } })
}
