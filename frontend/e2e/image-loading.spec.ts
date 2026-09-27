import { Page, expect, test } from './fixtures';
import { ALBUMS, STORAGE_PORT } from './seed';

const STORAGE_ORIGIN = `http://localhost:${STORAGE_PORT}`;
const RETIRED_STORAGE_HOST_PATTERN = /amazonaws\.com/;

interface ObservedRequest {
  url: string;
  failure: string | null;
}

interface ImageRequests {
  observed: ObservedRequest[];
  pending: () => number;
}

function isStorageRequest(url: string): boolean {
  return url.startsWith(STORAGE_ORIGIN) || RETIRED_STORAGE_HOST_PATTERN.test(url);
}

function observeImageRequests(page: Page): ImageRequests {
  const observed: ObservedRequest[] = [];
  let pending = 0;
  page.on('request', request => {
    if (isStorageRequest(request.url())) {
      pending++;
    }
  });
  page.on('requestfinished', request => {
    if (isStorageRequest(request.url())) {
      pending--;
      observed.push({ url: request.url(), failure: null });
    }
  });
  page.on('requestfailed', request => {
    if (isStorageRequest(request.url())) {
      pending--;
      observed.push({ url: request.url(), failure: request.failure()?.errorText ?? '' });
    }
  });
  return { observed, pending: () => pending };
}

// Every stored image on the page has loaded and no request for one is still open
async function settleImages(page: Page, requests: ImageRequests): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(origin => {
        const images = [...document.images].filter(image =>
          image.currentSrc.startsWith(origin),
        );
        return images.length > 0 && images.every(image => image.complete);
      }, STORAGE_ORIGIN),
    )
    .toBe(true);
  await expect.poll(requests.pending).toBe(0);
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
    const requests = observeImageRequests(page);

    await page.goto('/');
    await expect(page.locator('.photos-section .album-cover').first()).toBeVisible();
    await settleImages(page, requests);

    const failures = requests.observed.filter(request => request.failure !== null);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);

    const keys = requests.observed.map(request => objectKey(request.url));
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    expect(duplicates, `duplicate object requests: ${duplicates.join(', ')}`).toEqual([]);
  });

  test('browsing a photo album fires no failed or aborted image requests', async ({
    page,
  }) => {
    await page.goto('/photo-gallery');
    const cover = page.getByRole('button', {
      name: new RegExp(`^${ALBUMS.championship}`),
    });
    await expect(cover.getByRole('img')).toHaveJSProperty('complete', true);

    const requests = observeImageRequests(page);
    await cover.click();
    const viewerImage = page.locator('lcc-image-viewer img').first();
    await expect(viewerImage).toHaveAttribute('src', new RegExp(`^${STORAGE_ORIGIN}`));
    await expect(viewerImage).toHaveJSProperty('complete', true);
    await settleImages(page, requests);

    const failures = requests.observed.filter(request => request.failure !== null);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });

  test('stale persisted URLs are scrubbed at boot and never requested', async ({
    page,
  }) => {
    await page.route(RETIRED_STORAGE_HOST_PATTERN, route => route.abort());
    await page.goto('/');

    const imagesKey = () =>
      page.evaluate(() =>
        Object.keys(localStorage).find(key => key.startsWith('lcc.imagesState.')),
      );
    await expect.poll(imagesKey).toBeDefined();
    const storageKey = (await imagesKey())!;
    await expect
      .poll(() =>
        page.evaluate(key => {
          const state = JSON.parse(localStorage.getItem(key) ?? '{}');
          return Object.values<{ image?: { thumbnailUrl?: string } }>(
            state.entities ?? {},
          ).some(entity => entity.image?.thumbnailUrl);
        }, storageKey),
      )
      .toBe(true);

    // Once the page settles, nothing the app still has in flight can save over the rewrite
    await page.waitForLoadState('networkidle');

    // Rewrite the persisted state to cover both failure shapes: week-old
    // entries, and retired-storage URLs carrying a fresh expiration (the
    // corruption older app versions could write)
    await page.evaluate(key => {
      const state = JSON.parse(localStorage.getItem(key) as string);
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
      localStorage.setItem(key, JSON.stringify(state));
    }, storageKey);

    const requests = observeImageRequests(page);
    await page.reload();
    await expect(page.locator('.photos-section .album-cover').first()).toBeVisible();
    await settleImages(page, requests);

    const staleRequests = requests.observed.filter(request =>
      RETIRED_STORAGE_HOST_PATTERN.test(request.url),
    );
    expect(staleRequests, JSON.stringify(staleRequests, null, 2)).toEqual([]);

    const scrubbed = await page.evaluate(key => {
      const state = JSON.parse(localStorage.getItem(key) as string);
      return Object.values(state.entities ?? {}).every(entity => {
        const image = (entity as { image?: { mainUrl?: string; thumbnailUrl?: string } })
          .image;
        return (
          !image?.mainUrl?.includes('amazonaws') &&
          !image?.thumbnailUrl?.includes('amazonaws')
        );
      });
    }, storageKey);
    expect(scrubbed).toBe(true);
  });
});
