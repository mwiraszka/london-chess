import { Page, expect, test } from '@playwright/test';

const RETIRED_STORAGE_HOST_PATTERN = /amazonaws\.com/;
const IMAGE_STORAGE_PATTERN = /r2\.cloudflarestorage\.com|amazonaws\.com/;

interface ObservedRequest {
  url: string;
  failure: string | null;
}

function observeImageRequests(page: Page): ObservedRequest[] {
  const observed: ObservedRequest[] = [];
  page.on('requestfinished', request => {
    if (IMAGE_STORAGE_PATTERN.test(request.url())) {
      observed.push({ url: request.url(), failure: null });
    }
  });
  page.on('requestfailed', request => {
    if (IMAGE_STORAGE_PATTERN.test(request.url())) {
      observed.push({ url: request.url(), failure: request.failure()?.errorText ?? '' });
    }
  });
  return observed;
}

// The object key uniquely identifies what is being loaded; presigned query
// params differ per signing
function objectKey(url: string): string {
  return new URL(url).pathname;
}

test.describe('image loading', () => {
  test('home page load fires no failed, aborted, or duplicate image requests', async ({
    page,
  }) => {
    const observed = observeImageRequests(page);

    await page.goto('/');
    await page.waitForTimeout(8000);

    const failures = observed.filter(request => request.failure !== null);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);

    const keys = observed.map(request => objectKey(request.url));
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    expect(duplicates, `duplicate object requests: ${duplicates.join(', ')}`).toEqual([]);
  });

  test('browsing a photo album fires no failed or aborted image requests', async ({
    page,
  }) => {
    await page.goto('/photo-gallery');
    await page.waitForTimeout(5000);

    const observed = observeImageRequests(page);
    await page.locator('.album-cover').first().click();
    await page.waitForTimeout(12000);

    const failures = observed.filter(request => request.failure !== null);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });

  test('stale persisted URLs are scrubbed at boot and never requested', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForTimeout(5000);

    const imagesKey = await page.evaluate(() =>
      Object.keys(localStorage).find(key => key.startsWith('imagesState')),
    );
    expect(imagesKey).toBeDefined();

    // Rewrite the persisted state to cover both failure shapes: week-old
    // entries, and retired-storage URLs carrying a fresh expiration (the
    // corruption older app versions could write)
    await page.evaluate(storageKey => {
      const state = JSON.parse(localStorage.getItem(storageKey as string) as string);
      const staleDate = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const freshDate = new Date(Date.now() + 11 * 3600 * 1000).toISOString();
      let toggle = false;
      for (const id of Object.keys(state.entities ?? {})) {
        const image = state.entities[id]?.image;
        if (!image) {
          continue;
        }
        if (image.mainUrl) {
          image.mainUrl = `https://retired-bucket.s3.us-east-2.amazonaws.com/${id}`;
        }
        if (image.thumbnailUrl) {
          image.thumbnailUrl = `https://retired-bucket.s3.us-east-2.amazonaws.com/${id}-thumb`;
        }
        image.urlExpirationDate = toggle ? staleDate : freshDate;
        toggle = !toggle;
      }
      localStorage.setItem(storageKey as string, JSON.stringify(state));
    }, imagesKey);

    const observed = observeImageRequests(page);
    await page.reload();
    await page.waitForTimeout(8000);

    const staleRequests = observed.filter(request =>
      RETIRED_STORAGE_HOST_PATTERN.test(request.url),
    );
    expect(staleRequests, JSON.stringify(staleRequests, null, 2)).toEqual([]);

    const scrubbed = await page.evaluate(storageKey => {
      const state = JSON.parse(localStorage.getItem(storageKey as string) as string);
      return Object.values(state.entities ?? {}).every(entity => {
        const image = (entity as { image?: { mainUrl?: string; thumbnailUrl?: string } })
          .image;
        return (
          !image?.mainUrl?.includes('amazonaws') &&
          !image?.thumbnailUrl?.includes('amazonaws')
        );
      });
    }, imagesKey);
    expect(scrubbed).toBe(true);
  });
});
