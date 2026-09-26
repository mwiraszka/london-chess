import { defineConfig, devices } from '@playwright/test';

const isCi = !!process.env['CI'];

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? [['list'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'public',
      testIgnore: 'admin/**',
      fullyParallel: true,
    },
    {
      // Signed in as the one test account, so these run one at a time
      name: 'admin',
      testMatch: 'admin/**/*.spec.ts',
      fullyParallel: false,
      workers: 1,
    },
  ],
  webServer: [
    {
      // Never reused, so the suite can only ever run against the seeded throwaway database
      command: 'pnpm -C ../backend run start:e2e',
      url: 'http://localhost:3000/v1/version',
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'node scripts/generate-data.mjs && pnpm exec ng serve --port 4200',
      url: 'http://localhost:4200',
      reuseExistingServer: !isCi,
      timeout: 300_000,
    },
  ],
});
