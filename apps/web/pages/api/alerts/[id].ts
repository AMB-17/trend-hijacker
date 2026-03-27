import type { NextApiRequest, NextApiResponse } from 'next'
import { deleteAlert, updateAlert } from '../../../lib/server/demo-store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const id = String(idParam || '').trim()

  if (!id) {
    return res.status(400).json({ success: false, error: { message: 'Missing alert id' } })
  }

  if (req.method === 'PUT') {
    const body = typeof req.body === 'object' && req.body ? req.body : {}
    const userId = String((body as any).userId || '').trim()
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'Missing userId' } })
    }

    const updated = updateAlert(id, {
      userId,
      enabled: (body as any).enabled,
      name: (body as any).name,
      rule: (body as any).rule,
      channel: (body as any).channel,
      webhookUrl: (body as any).webhookUrl,
    })

    if (!updated) {
      return res.status(404).json({ success: false, error: { message: 'Alert not found' } })
    }

    return res.status(200).json({ success: true, data: updated })
  }

  if (req.method === 'DELETE') {
    const userIdParam = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId
    const userId = String(userIdParam || '').trim()
    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'Missing userId query param' } })
    }

    const deleted = deleteAlert(id, userId)
    if (!deleted) {
      return res.status(404).json({ success: false, error: { message: 'Alert not found' } })
    }
    return res.status(200).json({ success: true, data: { deleted: true } })
  }

  return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } })
}
