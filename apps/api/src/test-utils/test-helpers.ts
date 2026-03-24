import { vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import type { Pool, PoolClient } from 'pg';

/**
 * Create a mock PostgreSQL pool for testing
 */
export function createMockPool(): Pool {
  const mockPool = {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  } as unknown as Pool;

  return mockPool;
}

/**
 * Create a mock PostgreSQL client for testing
 */
export function createMockClient(): PoolClient {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
    on: vi.fn(),
  } as unknown as PoolClient;

  return mockClient;
}

/**
 * Create a mock Fastify instance for testing
 */
export function createTestApp(): FastifyInstance {
  const mockApp = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    register: vi.fn(),
    inject: vi.fn(),
    listen: vi.fn(),
    close: vi.fn(),
    log: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  } as unknown as FastifyInstance;

  return mockApp;
}

/**
 * Create a mock Redis client for testing
 */
export function mockRedisClient(): {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  keys: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
  ttl: ReturnType<typeof vi.fn>;
  flushall: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    keys: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    flushall: vi.fn(),
    quit: vi.fn(),
  };
}

/**
 * Mock API response helper
 */
export function mockApiResponse<T>(data: T, statusCode = 200) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    json: async () => ({ success: true, data }),
  };
}

/**
 * Mock error response helper
 */
export function mockErrorResponse(message: string, statusCode = 500) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    json: async () => ({ success: false, error: { message } }),
  };
}
