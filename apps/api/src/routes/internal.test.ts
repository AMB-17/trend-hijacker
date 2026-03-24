import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import internalRoutes from './internal';

vi.mock('../services/batch-ingestion.service', () => ({
  runIngestionBatch: vi.fn().mockResolvedValue({ ingested: 3 }),
}));

vi.mock('../services/batch-processing.service', () => ({
  runProcessingBatch: vi.fn().mockResolvedValue({ processed: 2 }),
}));

describe('internal cron routes security', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'a'.repeat(64);
    vi.clearAllMocks();
  });

  it('rejects unauthorized cron requests', async () => {
    const app = Fastify();
    await app.register(internalRoutes, { prefix: '/api/internal' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/internal/cron/run-all',
      payload: {},
      headers: { 'x-cron-secret': 'wrong-secret' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ success: false });

    await app.close();
  });

  it('accepts valid secret and blocks duplicate idempotency key replay', async () => {
    const app = Fastify();
    await app.register(internalRoutes, { prefix: '/api/internal' });

    const headers = {
      'x-cron-secret': process.env.CRON_SECRET as string,
      'x-idempotency-key': 'run-all-key-1',
    };

    const first = await app.inject({
      method: 'POST',
      url: '/api/internal/cron/run-all',
      payload: {},
      headers,
    });

    const second = await app.inject({
      method: 'POST',
      url: '/api/internal/cron/run-all',
      payload: {},
      headers,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({
      success: false,
      error: { message: 'Duplicate idempotency key' },
    });

    await app.close();
  });
});
