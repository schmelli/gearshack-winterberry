import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.worktrees/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        '__tests__/**',
        '*.config.{js,ts}',
        '.next/**',
        'scripts/**',
        'types/**',
        'specs/**',
      ],
      // Coverage thresholds (optional - can be adjusted)
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      // Fix ESM resolution for Next.js modules in test environment
      'next/navigation': path.resolve(__dirname, './__mocks__/next/navigation.ts'),
    },
  },
});
