import { expect, test } from '@playwright/test';

import { holdRequests } from './requests';

const GAMES_PAGE = /\/v1\/games\?/;

test.describe('game archives', () => {
  test('lays the table out at its final width before any game arrives', async ({
    page,
  }) => {
    const games = await holdRequests(page, GAMES_PAGE);

    await page.goto('/game-archives');

    const headers = page.locator('.games .ea-data-table__cell--header');
    const widths = () =>
      headers.evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
    await expect(page.locator('.games lcc-text-skeleton').first()).toBeVisible();
    const skeletonWidths = await widths();

    await games.release();

    await expect(page.locator('.games lcc-text-skeleton')).toHaveCount(0);
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

    await page.locator('.games .ea-paginator__page-btn', { hasText: /^2$/ }).click();

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
    const main = page.locator('main');
    await main.evaluate(element => element.scrollTo({ top: 400 }));

    await page.locator('.filters__result button', { hasText: '1-0' }).click();

    await expect(page).toHaveURL(/result=1-0/);
    expect(await main.evaluate(element => element.scrollTop)).toBe(400);
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
});
