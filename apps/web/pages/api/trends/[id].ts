import type { NextApiRequest, NextApiResponse } from 'next'
import { DEMO_TRENDS_EARLY, DEMO_TRENDS_EXPLODING } from '../_lib/demo-data'

const DEMO_TRENDS = [...DEMO_TRENDS_EARLY, ...DEMO_TRENDS_EXPLODING].map((trend) => ({
  ...trend,
  status: trend.status === 'VALIDATED' ? 'ACTIVE' : trend.status,
}))

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  const idParam = req.query.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam

  if (!id) {
    return res.status(400).json({ success: false, error: { message: 'Missing trend id' } })
  }

  const trend = DEMO_TRENDS.find((item) => item.id === id)

  if (!trend) {
    return res.status(404).json({ success: false, error: { message: 'Trend not found' } })
  }

  return res.status(200).json({ success: true, data: trend })
}
