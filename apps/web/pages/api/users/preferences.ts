import type { NextApiRequest, NextApiResponse } from 'next'
import { getPreferences, updatePreferences } from '../_demo-store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const userIdParam = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId
    const userId = String(userIdParam || '').trim()
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'Missing userId query param' } })
    }

    return res.status(200).json({ success: true, data: getPreferences(userId) })
  }

  if (req.method === 'PUT') {
    const body = typeof req.body === 'object' && req.body ? req.body : {}
    const userId = String((body as any).userId || '').trim()
    const preferences = (body as any).preferences || {}
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'Missing userId' } })
    }

    const preferredStages = Array.isArray(preferences.preferredStages)
      ? preferences.preferredStages.filter((x: unknown) => typeof x === 'string')
      : []
    const minOpportunityScore = Number.isFinite(Number(preferences.minOpportunityScore))
      ? Number(preferences.minOpportunityScore)
      : 0
    const digestCadence =
      preferences.digestCadence === 'daily' || preferences.digestCadence === 'weekly'
        ? preferences.digestCadence
        : 'off'

    const updated = updatePreferences(userId, {
      preferredStages,
      minOpportunityScore,
      digestCadence,
    })

    return res.status(200).json({ success: true, data: updated })
  }

  return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
}
