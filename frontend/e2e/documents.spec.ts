import { expect, test } from './fixtures';
import { bodyRows } from './tables';

test.describe('documents', () => {
  test('opens a document in the viewer and closes it again', async ({ page }) => {
    await page.goto('/documents');
    const table = page.getByRole('table', { name: 'Documents' });
    await expect(bodyRows(table)).not.toHaveCount(0);

    await table.getByRole('link', { name: 'Code of Conduct' }).first().click();

    await expect(page).toHaveURL(/\/documents#lcc-code-of-conduct\.pdf$/);
    const viewer = page.locator('lcc-document-viewer');
    await expect(viewer.locator('.page').first()).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(viewer).toHaveCount(0);
    await expect(page).toHaveURL(/\/documents$/);
  });

  test('offers each document as a download', async ({ page }) => {
    await page.goto('/documents');

    await expect(
      page.locator('a.documents__download[href="assets/documents/lcc-bylaws.pdf"]'),
    ).toHaveAttribute('download', 'Club Bylaws');
  });

  test('opens a document linked from the footer', async ({ page }) => {
    await page.goto('/');

    await page.locator('lcc-footer').getByRole('link', { name: 'Club Bylaws' }).click();

    await expect(page).toHaveURL(/\/documents#lcc-bylaws\.pdf$/);
    await expect(page.getByRole('dialog', { name: 'Document' })).toBeVisible();
  });
});
