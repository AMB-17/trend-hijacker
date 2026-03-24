import { describe, expect, it } from 'vitest';
import type { NextApiRequest } from 'next';
import {
  buildForwardHeaders,
  normalizeApiUrl,
  shouldTryLocalFallback,
} from '../../pages/api/proxy/[...path]';

describe('proxy security helpers', () => {
  it('normalizes only absolute upstream URLs and rejects relative proxy loops', () => {
    expect(normalizeApiUrl('https://api.example.com/')).toBe('https://api.example.com');
    expect(normalizeApiUrl('/api/proxy')).toBe('');
    expect(normalizeApiUrl('')).toBe('');
    expect(normalizeApiUrl('not-a-url')).toBe('');
  });

  it('blocks hop-by-hop headers when forwarding requests', () => {
    const req = {
      method: 'POST',
      body: { ok: true },
      headers: {
        host: 'localhost:3000',
        connection: 'keep-alive',
        'content-length': '12',
        'transfer-encoding': 'chunked',
        'accept-encoding': 'gzip',
        authorization: 'Bearer token',
      },
    } as unknown as NextApiRequest;

    const headers = buildForwardHeaders(req);

    expect(headers.host).toBeUndefined();
    expect(headers.connection).toBeUndefined();
    expect(headers['content-length']).toBeUndefined();
    expect(headers['transfer-encoding']).toBeUndefined();
    expect(headers['accept-encoding']).toBeUndefined();
    expect(headers.authorization).toBe('Bearer token');
    expect(headers['content-type']).toBe('application/json');
  });

  it('does not allow local fallback for internal API paths', () => {
    expect(shouldTryLocalFallback(['api', 'trends'])).toBe(true);
    expect(shouldTryLocalFallback(['api', 'internal', 'cron', 'run-all'])).toBe(false);
    expect(shouldTryLocalFallback(['health'])).toBe(false);
  });
});
