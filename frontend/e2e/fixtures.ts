import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';
export type { Locator, Page } from '@playwright/test';

// Keeps runs from reporting to Sentry or depending on GitHub's rate limits
export const test = base.extend<{ quietThirdParties: void }>({
  quietThirdParties: [
    async ({ context }, use) => {
      await context.route(/\.ingest\.[a-z.]*sentry\.io\//, route =>
        route.fulfill({ status: 200, json: {} }),
      );
      await context.route(/^https:\/\/api\.github\.com\//, route =>
        route.fulfill({ status: 200, json: [] }),
      );
      await use();
    },
    { auto: true },
  ],
});
