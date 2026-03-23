import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiUrl = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '')
  const pathParts = Array.isArray(req.query.path) ? req.query.path : []
  const queryString = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const targetUrl = `${apiUrl}/${pathParts.join('/')}${queryString}`

  return fetch(targetUrl, {
    method: req.method,
    headers: req.headers as any,
    body: req.body ? JSON.stringify(req.body) : undefined,
  })
    .then(async response => {
      const text = await response.text()

      try {
        const data = JSON.parse(text)
        return res.status(response.status).json(data)
      } catch {
        return res.status(response.status).send(text)
      }
    })
    .catch(error => res.status(500).json({ error: error.message }))
}
