import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
  }

  // Minimal dependency-free fallback to keep dashboard cards functional.
  return res.status(200).json({ success: true, data: [] })
}
