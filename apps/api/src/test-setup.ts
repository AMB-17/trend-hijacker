import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.CRON_SECRET = 'test-cron-secret-32-characters-long-for-testing';
process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long-for-testing-purposes';
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.HOST = '0.0.0.0';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.LOG_LEVEL = 'error';

beforeAll(() => {
  console.log('🧪 Test environment initialized');
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  console.log('🧪 Test environment cleaned up');
});
