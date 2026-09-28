import { Page, expect, test } from './fixtures';
import { failRequests, holdRequests } from './requests';

const ARTICLES = /\/v1\/articles(\?|$)/;
const EVENTS = /\/v1\/events(\?|$)/;
const MEMBERS = /\/v1\/public\/members(\?|$)/;
const IMAGES_METADATA = /\/v1\/images\/all-metadata$/;
const LISTS = /\/v1\/(articles|events|images\/all-metadata|public\/members)(\?|$)/;

// Makes the stored articles due for a refresh from the next page load on
async function expireStoredArticles(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const key = Object.keys(localStorage).find(key =>
      key.startsWith('lcc.articlesState.'),
    );
    if (!key) {
      throw new Error('No articles are stored.');
    }
    const state = JSON.parse(localStorage.getItem(key) ?? '{}');
    state.lastFilteredFetch = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    localStorage.setItem(key, JSON.stringify(state));
  });
}

async function touch(
  page: Page,
  type: 'touchstart' | 'touchmove' | 'touchend',
  clientY?: number,
): Promise<void> {
  await page.locator('main').evaluate(
    (main, { type, clientY }) => {
      const touches =
        clientY === undefined
          ? []
          : [new Touch({ identifier: 1, target: main, clientX: 100, clientY })];
      main.dispatchEvent(
        new TouchEvent(type, { bubbles: true, cancelable: true, touches }),
      );
    },
    { type, clientY },
  );
}

test.describe('loading states', () => {
  test('home page sections show skeletons until their data arrives', async ({ page }) => {
    const lists = await holdRequests(page, LISTS);

    await page.goto('/');

    const schedule = page.locator('.schedule-section');
    const articles = page.locator('.articles-section');
    const photos = page.locator('.photos-section');
    await expect(schedule.locator('lcc-events-table ea-skeleton').first()).toBeVisible();
    await expect(articles.locator('a.article.skeleton').first()).toBeVisible();
    await expect(photos.locator('.album-cover.skeleton').first()).toBeVisible();

    await lists.release();

    await expect(schedule.locator('.date-skeleton')).toHaveCount(0);
    await expect(articles.locator('a.article.skeleton')).toHaveCount(0);
    await expect(photos.locator('.album-cover.skeleton')).toHaveCount(0);
    await expect(articles.locator('a.article').first()).toBeVisible();
    await expect(photos.locator('.album-cover').first()).toBeVisible();
  });

  test('pages stay usable while their data loads', async ({ page }) => {
    await holdRequests(page, ARTICLES);

    await page.goto('/news');
    await expect(page.locator('a.article.skeleton').first()).toBeVisible();
    await page
      .locator('lcc-navigation-bar')
      .getByRole('link', { name: 'Schedule' })
      .click();

    await expect(page).toHaveURL(/\/schedule$/);
    await expect(page.locator('.page-heading')).toHaveText('Schedule');
  });

  test('content already on screen stays in place while it refreshes', async ({
    page,
  }) => {
    await page.goto('/news');
    const articleCards = page.locator('a.article:not(.skeleton)');
    await expect(articleCards.first()).toBeVisible();
    const articles = await holdRequests(page, ARTICLES);
    await expireStoredArticles(page);

    await page.reload();

    await expect.poll(articles.count).toBeGreaterThan(0);
    await expect(articleCards.first()).toBeVisible();
    await expect(page.locator('a.article.skeleton')).toHaveCount(0);

    await articles.release();
  });

  test('a failed first load offers to try again', async ({ page }) => {
    const recover = await failRequests(page, EVENTS);

    await page.goto('/schedule');

    const failure = page.locator('lcc-load-failed');
    await expect(failure).toContainText('Unable to load the schedule');
    await expect(page.locator('lcc-events-table')).toHaveCount(0);
    await expect(page.locator('lcc-schedule-toolbar')).toBeVisible();

    recover();
    await failure.getByRole('button', { name: 'Try again' }).click();

    await expect(failure).toHaveCount(0);
    await expect(page.locator('lcc-events-table .date-skeleton')).toHaveCount(0);
    await expect(page.locator('lcc-events-calendar-grid ea-skeleton')).toHaveCount(0);
  });

  test('failed sections offer to try again while the rest load as usual', async ({
    page,
  }) => {
    const recover = await failRequests(page, IMAGES_METADATA);

    await page.goto('/');

    const photosFailure = page.locator('.photos-section lcc-load-failed');
    await expect(photosFailure).toContainText('Unable to load photos');
    await expect(page.locator('.articles-section lcc-load-failed')).toContainText(
      'Unable to load the latest news',
    );
    await expect(page.locator('.schedule-section lcc-load-failed')).toHaveCount(0);

    recover();
    await photosFailure.getByRole('button', { name: 'Try again' }).click();

    await expect(page.locator('lcc-load-failed')).toHaveCount(0);
    await expect(page.locator('.photos-section .album-cover').first()).toBeVisible();
  });

  test('a request that never answers times out into a failure panel', async ({
    page,
  }) => {
    await page.clock.install();
    await holdRequests(page, MEMBERS);

    await page.goto('/members');
    await expect(page.locator('lcc-members-table ea-skeleton').first()).toBeVisible();

    await page.clock.fastForward('00:31');

    await expect(page.locator('lcc-load-failed')).toContainText('Unable to load members');
    await expect(page.locator('lcc-members-table')).toHaveCount(0);
  });
});

test.describe('pull to refresh', () => {
  test.use({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
  });

  test('keeps the arrow spinning until the refreshed data is back', async ({ page }) => {
    await page.goto('/');
    const articleCards = page.locator('.articles-section a.article:not(.skeleton)');
    await expect(articleCards.first()).toBeVisible();
    const arrow = page.locator('lcc-pull-to-refresh-indicator ea-icon-refresh-cw');
    const spinning = page.locator('lcc-pull-to-refresh-indicator .indicator--refreshing');
    const lists = await holdRequests(page, LISTS);

    await touch(page, 'touchstart', 100);
    await touch(page, 'touchmove', 300);

    await expect(arrow).toBeVisible();

    await touch(page, 'touchend');

    await expect(spinning).toBeVisible();
    await expect.poll(lists.count).toBeGreaterThan(0);

    await lists.release();

    await expect(arrow).toHaveCount(0);
    await expect(articleCards.first()).toBeVisible();
  });
});
