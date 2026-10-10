import { Page, expect, test } from './fixtures';
import { holdRequests } from './requests';

const GAMES_PAGE = /\/v1\/games\?/;

function rows(page: Page) {
  return page.locator('.games .ea-data-table__body .ea-data-table__row');
}

async function sortedMoves(page: Page, order: 'asc' | 'desc'): Promise<void> {
  const response = page.waitForResponse(
    response =>
      GAMES_PAGE.test(response.url()) &&
      response.url().includes(`sortBy=moves&sortOrder=${order}`),
  );
  await page.getByRole('columnheader', { name: 'Moves' }).getByRole('button').click();
  await response;
}

test.describe('game archives', () => {
  test('lays the table out at its final width before any game arrives', async ({
    page,
  }) => {
    const games = await holdRequests(page, GAMES_PAGE);

    await page.goto('/game-archives');

    const headers = page.locator('.games .ea-data-table__cell--header');
    const widths = () =>
      headers.evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
    await expect(
      page.locator('.games .ea-data-table__row--placeholder').first(),
    ).toBeVisible();
    const skeletonWidths = await widths();

    await games.release();

    await expect(page.locator('.games .ea-data-table__row--placeholder')).toHaveCount(0);
    await expect(
      page.locator('.games .ea-data-table__body .ea-data-table__row').first(),
    ).toBeVisible();
    expect(await widths()).toEqual(skeletonWidths);
  });

  test('keeps the total on the paginator while another page loads', async ({ page }) => {
    await page.goto('/game-archives');
    const range = page.locator('.games .ea-paginator__range');
    await expect(range).toContainText(/of [\d,]+/);
    const total = (await range.textContent())?.match(/of ([\d,]+)/)?.[1];
    const games = await holdRequests(page, GAMES_PAGE);

    await page.getByRole('button', { name: 'Go to page 2' }).click();

    await expect.poll(games.count).toBeGreaterThan(0);
    await expect(range).toContainText(`of ${total}`);
    await expect(range).not.toContainText('0 of 0');

    await games.release();
  });

  test('keeps the scroll position when a filter changes', async ({ page }) => {
    await page.goto('/game-archives');
    await expect(
      page.locator('.games .ea-data-table__body .ea-data-table__row').first(),
    ).toBeVisible();
    const scroller = page.locator('.scroller');
    await scroller.evaluate(element => element.scrollTo({ top: 400 }));

    await page.locator('.filters__result button', { hasText: '1-0' }).click();

    await expect(page).toHaveURL(/result=1-0/);
    expect(await scroller.evaluate(element => element.scrollTop)).toBe(400);
  });

  test('links every row to its game', async ({ page }) => {
    await page.goto('/game-archives');

    const firstRow = page
      .locator('.games .ea-data-table__body .ea-data-table__row')
      .first();
    await expect(firstRow.locator('a').first()).toHaveAttribute(
      'href',
      /\/game-archives\/[0-9a-f]{24}$/,
    );
  });

  test('shows the archive figures', async ({ page }) => {
    await page.goto('/game-archives');

    const values = page.locator('.figures .figure__value');
    await expect(values).toHaveCount(4);
    for (const value of await values.all()) {
      await expect(value).toHaveText(/[1-9]/, { timeout: 5_000 });
    }
  });

  test('sends a visitor with a mistyped game link home', async ({ page }) => {
    await page.goto('/game-archives/000000000000000000000000');

    await expect(page).toHaveURL(/\/$/);
  });

  test('sorts the games by a column, one way and then the other', async ({ page }) => {
    await page.goto('/game-archives');
    await expect(rows(page).first()).toBeVisible();
    const header = page.getByRole('columnheader', { name: 'Moves' });
    const moves = async () =>
      (await rows(page).locator('td:last-child').allInnerTexts()).map(Number);

    await sortedMoves(page, 'asc');

    await expect(page).toHaveURL(/\?sort=moves&order=asc$/);
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    const ascending = await moves();
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));

    await sortedMoves(page, 'desc');

    await expect(page).toHaveURL(/\?sort=moves$/);
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    const descending = await moves();
    expect(descending).toEqual([...descending].sort((a, b) => b - a));
  });

  test('opens on the filter and order a link asks for', async ({ page }) => {
    await page.goto('/game-archives?result=0-1&sort=moves&order=asc');

    const results = rows(page).locator('.games__result');
    await expect(results.first()).toHaveText('0-1');
    await expect(results.filter({ hasNotText: '0-1' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Moves' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  test('opens as it was last left when a link asks for nothing in particular', async ({
    page,
  }) => {
    await page.goto('/game-archives?result=0-1&sort=moves&order=asc');
    await expect(rows(page).first().locator('.games__result')).toHaveText('0-1');

    await page.goto('/game-archives');

    await expect(page).toHaveURL(/\/game-archives\?result=0-1&sort=moves&order=asc$/);
    await expect(rows(page).first().locator('.games__result')).toHaveText('0-1');
  });
});
