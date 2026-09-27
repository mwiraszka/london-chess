import { defineConfig, devices } from '@playwright/test';

const isCi = !!process.env['CI'];

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  // A broken build fails every test alike, so CI stops early instead of running them all
  maxFailures: isCi ? 3 : 0,
  reporter: isCi ? [['list'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:4300',
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
      url: 'http://localhost:3300/v1/version',
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      // A build rather than the dev server, which compiles on demand and so is slower and
      // can fail on imports a build resolves
      command:
        'node scripts/generate-data.mjs && pnpm exec ng build --configuration e2e && node e2e/serve.mjs',
      url: 'http://localhost:4300',
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
