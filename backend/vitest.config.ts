import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      CLERK_SECRET_KEY: 'sk_test_unused',
      CLERK_WEBHOOK_SECRET: 'whsec_dGVzdC1zZWNyZXQ=',
    },
    clearMocks: true,
    include: ['src/**/*.spec.ts'],
  },
});
