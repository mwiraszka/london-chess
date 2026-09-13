import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm -C ../backend run start',
      url: 'http://localhost:3000/v1/version',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm start',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
