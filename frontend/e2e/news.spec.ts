import { expect, test } from './fixtures';
import { ADMIN, ARTICLES } from './seed';

const [LATEST, BLITZ_RESULTS, , BOOKMARKED] = ARTICLES;

test.describe('news', () => {
  test('lists every article with the bookmarked one first', async ({ page }) => {
    await page.goto('/news');

    const cards = page
      .locator('main')
      .getByRole('link')
      .filter({
        has: page.getByRole('heading', { level: 3 }),
      });
    await expect(cards.first()).toContainText(BOOKMARKED.title);
    for (const article of ARTICLES) {
      await expect(
        page.getByRole('heading', { name: article.title, level: 3 }),
      ).toBeVisible();
    }
  });

  test('narrows the list to the articles matching a search', async ({ page }) => {
    await page.goto('/news');
    await expect(
      page.getByRole('heading', { name: LATEST.title, level: 3 }),
    ).toBeVisible();

    await page.getByRole('textbox', { name: 'Search' }).fill('blitz');

    await expect(page.getByRole('heading', { name: LATEST.title, level: 3 })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('heading', { name: BLITZ_RESULTS.title, level: 3 }),
    ).toBeVisible();
  });

  test('shows an article with its banner, author and formatted body', async ({
    page,
  }) => {
    await page.goto(`/article/view/${LATEST.id}`);

    const main = page.locator('main');
    await expect(main.getByRole('heading', { name: LATEST.title })).toBeVisible();
    await expect(main.getByText(`${ADMIN.firstName} ${ADMIN.lastName}`)).toBeVisible();
    await expect(
      main.getByRole('heading', { name: 'A tense finish', level: 2 }),
    ).toBeVisible();
    await expect(
      main.getByText('London Chess Championship', { exact: true }),
    ).toBeVisible();
    await expect(
      main.getByRole('listitem').filter({ hasText: 'Six players' }),
    ).toBeVisible();
    await expect(main.locator('img[alt="Club night"]').first()).toHaveJSProperty(
      'complete',
      true,
    );

    await main.getByRole('link', { name: 'More articles' }).click();

    await expect(page).toHaveURL(/\/news$/);
  });
});
