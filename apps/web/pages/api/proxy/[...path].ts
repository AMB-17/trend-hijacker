import type { NextApiRequest, NextApiResponse } from 'next'

function getOrigin(req: NextApiRequest): string {
  const host = req.headers.host
  const forwardedProto = req.headers['x-forwarded-proto']
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto
  const scheme = proto || (process.env.NODE_ENV === 'development' ? 'http' : 'https')
  return `${scheme}://${host}`
}

function shouldTryLocalFallback(pathParts: string[]): boolean {
  const joined = pathParts.join('/')
  return joined.startsWith('api/signals/') || joined.startsWith('api/opportunities')
}

async function proxyFetch(targetUrl: string, req: NextApiRequest, res: NextApiResponse) {
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: req.headers as any,
    body: req.body ? JSON.stringify(req.body) : undefined,
  })

  const text = await response.text()

  try {
    const data = JSON.parse(text)
    return res.status(response.status).json(data)
  } catch {
    return res.status(response.status).send(text)
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const configuredApiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
  const apiUrl = (configuredApiUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '')).replace(/\/$/, '')

  const pathParts = Array.isArray(req.query.path) ? req.query.path : []
  if (pathParts.length === 0) {
    return res.status(400).json({ error: 'Missing proxy path.' })
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'proxy') {
    return res.status(400).json({ error: 'Invalid recursive proxy path.' })
  }

  const queryString = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const localTargetUrl = `${getOrigin(req)}/${pathParts.join('/')}${queryString}`

  if (!apiUrl) {
    if (shouldTryLocalFallback(pathParts)) {
      return proxyFetch(localTargetUrl, req, res)
    }

    return res.status(500).json({
      error: 'API proxy is not configured. Set API_URL on the web deployment environment.',
    })
  }

  const targetUrl = `${apiUrl}/${pathParts.join('/')}${queryString}`

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: req.headers as any,
      body: req.body ? JSON.stringify(req.body) : undefined,
    })

    if (!response.ok && shouldTryLocalFallback(pathParts)) {
      return proxyFetch(localTargetUrl, req, res)
    }

    const text = await response.text()
    try {
      const data = JSON.parse(text)
      return res.status(response.status).json(data)
    } catch {
      return res.status(response.status).send(text)
    }
  } catch (error: any) {
    if (shouldTryLocalFallback(pathParts)) {
      try {
        return await proxyFetch(localTargetUrl, req, res)
      } catch {
        // Fall through to original error below.
      }
    }
    return res.status(500).json({ error: error?.message || 'Proxy request failed' })
  }
}
