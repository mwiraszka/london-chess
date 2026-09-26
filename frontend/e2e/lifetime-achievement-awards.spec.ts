import { expect, test } from './fixtures';

test.describe('lifetime achievement awards', () => {
  test('lists the recipients by year, newest first', async ({ page }) => {
    await page.goto('/lifetime-achievement-awards');

    const years = page.locator('main').getByRole('heading', { level: 3 });
    await expect(years.first()).toHaveText(/^\d{4}$/);
    const labels = await years.allTextContents();
    expect(labels.map(Number)).toEqual([...labels.map(Number)].sort((a, b) => b - a));
    await expect(page.locator('main').getByRole('img')).not.toHaveCount(0);
  });
});
