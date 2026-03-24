import type { NextApiRequest, NextApiResponse } from 'next'

function normalizeApiUrl(value?: string): string {
  const candidate = value?.trim()
  if (!candidate) {
    return ''
  }

  // Ignore relative proxy values (for example /api/proxy) for server-side upstream fetches.
  if (candidate.startsWith('/')) {
    return ''
  }

  try {
    const url = new URL(candidate)
    return url.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

function getOrigin(req: NextApiRequest): string {
  const host = req.headers.host
  const forwardedProto = req.headers['x-forwarded-proto']
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto
  const scheme = proto || (process.env.NODE_ENV === 'development' ? 'http' : 'https')
  return `${scheme}://${host}`
}

function shouldTryLocalFallback(pathParts: string[]): boolean {
  const joined = pathParts.join('/')
  return (
    joined.startsWith('api/signals/') ||
    joined.startsWith('api/opportunities') ||
    joined.startsWith('api/trends')
  )
}

function buildForwardHeaders(req: NextApiRequest): Record<string, string> {
  const blockedHeaders = new Set([
    'host',
    'connection',
    'content-length',
    'transfer-encoding',
    'accept-encoding',
  ])

  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    const lowerKey = key.toLowerCase()
    if (blockedHeaders.has(lowerKey) || typeof value === 'undefined') {
      continue
    }

    headers[lowerKey] = Array.isArray(value) ? value.join(', ') : value
  }

  if (!headers['content-type'] && req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    headers['content-type'] = 'application/json'
  }

  return headers
}

async function readProxyResponse(response: Response, res: NextApiResponse) {
  const text = await response.text()

  try {
    const data = JSON.parse(text)
    return res.status(response.status).json(data)
  } catch {
    return res.status(response.status).send(text)
  }
}

async function proxyFetch(targetUrl: string, req: NextApiRequest, res: NextApiResponse) {
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: buildForwardHeaders(req),
    body: req.body ? JSON.stringify(req.body) : undefined,
  })

  return readProxyResponse(response, res)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiUrl =
    normalizeApiUrl(process.env.API_URL) ||
    normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL) ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '')

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
      headers: buildForwardHeaders(req),
      body: req.body ? JSON.stringify(req.body) : undefined,
    })

    if (!response.ok && shouldTryLocalFallback(pathParts)) {
      return proxyFetch(localTargetUrl, req, res)
    }

    return readProxyResponse(response, res)
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
