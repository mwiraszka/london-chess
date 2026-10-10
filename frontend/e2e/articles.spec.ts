import { expect, test } from './fixtures';
import { ADMIN, ARTICLES } from './seed';

const [LATEST, BLITZ_RESULTS, , BOOKMARKED] = ARTICLES;

test.describe('articles', () => {
  test('lists every article with the bookmarked one first', async ({ page }) => {
    await page.goto('/articles');

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
    await page.goto('/articles');
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

    await expect(page).toHaveURL(/\/articles$/);
  });

  test('jumps to a heading from the article contents without moving the header', async ({
    page,
  }) => {
    await page.goto(`/article/view/${LATEST.id}`);
    const header = page.locator('lcc-header');
    const headerTop = async () => (await header.boundingBox())?.y;
    await expect(
      page.locator('main').getByRole('heading', { name: 'A tense finish' }),
    ).toBeVisible();
    const topBefore = await headerTop();

    await page
      .locator('.table-of-contents')
      .getByRole('link', { name: 'A tense finish' })
      .click();

    await expect(page).toHaveURL(/#a-tense-finish$/);
    await expect
      .poll(() => page.locator('.scroller').evaluate(element => element.scrollTop))
      .toBeGreaterThan(0);
    expect(await headerTop()).toBe(topBefore);
    expect(await page.locator('app-root').evaluate(element => element.scrollTop)).toBe(0);
  });
});
