import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/test-setup.ts',
        '**/test-utils/**',
      ],
      thresholds: {
        // Bootstrap thresholds for initial hardening cycle; raise as suite expands.
        lines: 30,
        functions: 20,
        branches: 35,
        statements: 30,
      },
    },
  },
});
