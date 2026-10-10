import { expect, test } from './fixtures';
import { ALBUMS, ARTICLES, PAST_EVENTS, PICNIC_IMAGES, UPCOMING_EVENTS } from './seed';

test.describe('home page', () => {
  test('welcomes visitors and announces the next event', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Welcome to the home of London chess!' }),
    ).toBeVisible();
    const banner = page.locator('lcc-upcoming-event-banner');
    await expect(banner).toContainText('Next event:');
    await expect(banner).toContainText(UPCOMING_EVENTS[0].title);
  });

  test('lists upcoming events only, linking to the full schedule', async ({ page }) => {
    await page.goto('/');

    const events = page.getByRole('table', { name: 'Events' });
    for (const event of UPCOMING_EVENTS) {
      await expect(
        events.getByRole('heading', { name: event.title, exact: true }),
      ).toBeVisible();
    }
    for (const event of PAST_EVENTS) {
      await expect(
        events.getByRole('heading', { name: event.title, exact: true }),
      ).toHaveCount(0);
    }

    await page.getByRole('link', { name: 'All scheduled events' }).click();

    await expect(page).toHaveURL(/\/schedule$/);
  });

  test('shows the latest articles, opening one from its card', async ({ page }) => {
    await page.goto('/');

    for (const article of ARTICLES) {
      await expect(
        page.getByRole('heading', { name: article.title, level: 3 }),
      ).toBeVisible();
    }

    await page.getByRole('link', { name: new RegExp(ARTICLES[1].title) }).click();

    await expect(page).toHaveURL(new RegExp(`/article/view/${ARTICLES[1].id}$`));
    await expect(page.getByRole('heading', { name: ARTICLES[1].title })).toBeVisible();
  });

  test('shows photo albums, opening one in the viewer', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: new RegExp(`^${ALBUMS.picnic}`) }).click();

    const viewer = page.locator('lcc-image-viewer');
    await expect(viewer.getByRole('heading', { name: ALBUMS.picnic })).toBeVisible();
    await expect(viewer.getByRole('figure')).toContainText(PICNIC_IMAGES[0].caption);
  });
});
