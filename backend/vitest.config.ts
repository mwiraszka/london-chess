import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      CLERK_SECRET_KEY: 'sk_test_unused',
      CLERK_WEBHOOK_SECRET: 'whsec_dGVzdC1zZWNyZXQ=',
    },
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    silent: 'passed-only',
    include: ['src/**/*.spec.ts'],
    globalSetup: ['src/testing/global-setup.ts'],
    setupFiles: ['src/testing/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/server.ts',
        'src/testing/**',
        // Type declarations only
        'src/models/api-response.model.ts',
        'src/models/core.model.ts',
        'src/models/pagination.model.ts',
      ],
      reporter: ['text', 'text-summary', 'json-summary'],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
