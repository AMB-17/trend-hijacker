import type { NextApiRequest, NextApiResponse } from 'next'
import { createAlert, listAlerts } from '@/lib/server/demo-store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userIdParam = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId
  const userIdFromQuery = String(userIdParam || '').trim()

  if (req.method === 'GET') {
    if (!userIdFromQuery) {
      return res.status(400).json({ success: false, error: { message: 'Missing userId query param' } })
    }

    const enabledOnlyRaw = Array.isArray(req.query.enabledOnly) ? req.query.enabledOnly[0] : req.query.enabledOnly
    const enabledOnly = String(enabledOnlyRaw || 'false').toLowerCase() === 'true'
    const rows = listAlerts(userIdFromQuery, enabledOnly)
    return res.status(200).json({ success: true, data: rows })
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'object' && req.body ? req.body : {}
    const userId = String((body as any).userId || '').trim()
    const name = String((body as any).name || '').trim()
    const channel = ((body as any).channel || 'in_app') as 'in_app' | 'webhook'
    const enabled = Boolean((body as any).enabled ?? true)
    const webhookUrl = String((body as any).webhookUrl || '').trim() || undefined
    const rule = (body as any).rule || {}
    const stages = Array.isArray(rule.stages) ? rule.stages.filter((x: unknown) => typeof x === 'string') : []
    const keywords = Array.isArray(rule.keywords) ? rule.keywords.filter((x: unknown) => typeof x === 'string') : []
    const minOpportunityScore = Number.isFinite(Number(rule.minOpportunityScore))
      ? Number(rule.minOpportunityScore)
      : 0

    if (!userId || !name) {
      return res.status(400).json({ success: false, error: { message: 'Missing required fields userId/name' } })
    }

    const created = createAlert({
      userId,
      name,
      channel,
      enabled,
      webhookUrl,
      rule: {
        minOpportunityScore,
        stages,
        keywords,
      },
    })

    return res.status(201).json({ success: true, data: created })
  }

  return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
}

