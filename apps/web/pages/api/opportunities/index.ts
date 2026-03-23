import type { NextApiRequest, NextApiResponse } from 'next'
import { opportunityMapService } from '../../../../api/src/services/opportunity-map.service'

const EMPTY_MAP = {
  items: [],
  quadrants: {
    quickWins: [],
    bigBets: [],
    fillIns: [],
    hardSlogs: [],
  },
  summary: {
    total: 0,
    byStage: {
      early_signal: 0,
      emerging: 0,
      exploding: 0,
    },
    avgOpportunityScore: 0,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  try {
    const mapData = await opportunityMapService.getOpportunityMap()
    return res.status(200).json({ success: true, data: mapData })
  } catch {
    // If upstream services (DB/Redis) are unavailable, keep the dashboard functional.
    return res.status(200).json({ success: true, data: EMPTY_MAP })
  }
}
