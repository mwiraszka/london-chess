import { expect, test } from './fixtures';

test.describe('regional clubs', () => {
  test('lists the clubs nearby with their venues', async ({ page }) => {
    await page.goto('/regional-clubs');

    for (const club of [
      'St. Thomas Chess Club',
      'New Hamburg Chess Club',
      'Glencoe Chess Club',
    ]) {
      await expect(page.getByRole('heading', { name: club, level: 3 })).toBeVisible();
    }
    await expect(page.locator('main')).toContainText('135 Wellington Street');
  });
});
