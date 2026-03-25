import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import internalRoutes from './internal';

vi.mock('../services/batch-ingestion.service', () => ({
  runIngestionBatch: vi.fn().mockResolvedValue({ ingested: 3 }),
}));

vi.mock('../services/batch-processing.service', () => ({
  runProcessingBatch: vi.fn().mockResolvedValue({ processed: 2 }),
}));

vi.mock('../services/alert.service', () => ({
  alertService: {
    evaluateAlerts: vi.fn().mockResolvedValue([{ alertId: 'a1', matchedTrendIds: ['t1'], matchedCount: 1 }]),
    evaluateAllAlerts: vi.fn().mockResolvedValue({
      usersEvaluated: 1,
      alertsEvaluated: 1,
      alertsTriggered: 1,
      webhookDeliveries: 0,
      results: [{ userId: 'u1', evaluations: [{ alertId: 'a1', matchedTrendIds: ['t1'], matchedCount: 1 }] }],
    }),
  },
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

  it('evaluates alerts for a single user when userId is provided', async () => {
    const app = Fastify();
    await app.register(internalRoutes, { prefix: '/api/internal' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/internal/cron/alerts-evaluate',
      payload: {
        userId: 'u1',
        limit: 10,
      },
      headers: { 'x-cron-secret': process.env.CRON_SECRET as string },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        userId: 'u1',
        evaluated: 1,
      },
    });

    await app.close();
  });

  it('evaluates alerts for all users when userId is omitted', async () => {
    const app = Fastify();
    await app.register(internalRoutes, { prefix: '/api/internal' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/internal/cron/alerts-evaluate',
      payload: {
        limit: 20,
        deliverWebhooks: true,
      },
      headers: { 'x-cron-secret': process.env.CRON_SECRET as string },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        usersEvaluated: 1,
        alertsEvaluated: 1,
      },
    });

    await app.close();
  });
});
