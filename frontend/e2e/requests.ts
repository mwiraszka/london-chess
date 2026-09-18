import { Page, Route } from '@playwright/test';

export interface HeldRequests {
  count: () => number;
  release: () => Promise<void>;
}

// Holds matching requests until released, so a test can inspect the page mid-load
export async function holdRequests(page: Page, url: RegExp): Promise<HeldRequests> {
  const held: Route[] = [];
  let isReleased = false;

  await page.route(url, route => {
    if (isReleased) {
      return route.fallback();
    }
    held.push(route);
  });

  return {
    count: () => held.length,
    release: async () => {
      isReleased = true;
      await Promise.all(held.splice(0).map(route => route.fallback()));
    },
  };
}

export async function failRequests(page: Page, url: RegExp): Promise<() => void> {
  let isFailing = true;

  await page.route(url, route =>
    isFailing
      ? route.fulfill({ status: 503, json: { message: 'Service unavailable.' } })
      : route.fallback(),
  );

  return () => {
    isFailing = false;
  };
}
