import type { NextApiRequest, NextApiResponse } from 'next'

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

  // Minimal dependency-free fallback to keep dashboard cards functional.
  return res.status(200).json({ success: true, data: EMPTY_MAP })
}
