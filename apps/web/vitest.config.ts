import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.tsx', '**/*.test.ts'],
    exclude: ['node_modules', '.next', 'out'],
    setupFiles: ['./lib/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**', 'components/**', 'app/**'],
      exclude: [
        '**/*.test.tsx',
        '**/*.test.ts',
        'lib/test-setup.ts',
        'lib/test-utils/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
