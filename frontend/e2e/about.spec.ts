import { expect, test } from './fixtures';

test.describe('about', () => {
  test('expands a section to read it and collapses it again', async ({ page }) => {
    await page.goto('/about');
    const parking = page.locator('lcc-expansion-panel').filter({
      has: page.getByRole('heading', { name: '🚗 Parking' }),
    });
    await expect(parking.locator('.expansion-content')).toHaveCount(0);

    await parking.getByRole('heading', { name: '🚗 Parking' }).click();

    await expect(parking.locator('.expansion-content')).toBeVisible();
    await expect(parking.locator('.expansion-content')).not.toBeEmpty();

    await parking.getByRole('heading', { name: '🚗 Parking' }).click();

    await expect(parking.locator('.expansion-content')).toHaveCount(0);
  });
});
