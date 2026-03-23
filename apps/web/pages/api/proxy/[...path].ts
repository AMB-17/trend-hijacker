import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  
  // Proxy API requests
  return fetch(`${apiUrl}${req.url}`, {
    method: req.method,
    headers: req.headers as any,
    body: req.body ? JSON.stringify(req.body) : undefined,
  })
    .then(response => response.json())
    .then(data => res.status(200).json(data))
    .catch(error => res.status(500).json({ error: error.message }))
}
