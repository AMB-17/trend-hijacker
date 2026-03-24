import type { NextApiRequest, NextApiResponse } from 'next'
import { DEMO_OPPORTUNITY_MAP } from '../../../lib/demo-data'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  return res.status(200).json({ success: true, data: DEMO_OPPORTUNITY_MAP })
}
