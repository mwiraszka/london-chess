import { expect, test } from '../fixtures';
import { BANNER_IMAGES } from '../seed';
import {
  API,
  APP_API,
  RESPONSE_TIMEOUT,
  confirm,
  logIn,
  openAdminControls,
  requireAdminCredentials,
  uniqueName,
} from './session';

test.describe('managing articles', () => {
  test.beforeEach(requireAdminCredentials);

  test('publishes, edits and deletes an article', async ({ page }) => {
    const title = uniqueName('Club notice');
    await logIn(page);

    await page.goto('/news');
    await page.getByRole('link', { name: 'Create an article' }).click();
    await expect(page).toHaveURL(/\/article\/add$/);
    await page.locator('.select-banner-image-button').click();
    const explorer = page.locator('lcc-dialog lcc-image-explorer');
    await explorer
      .locator('.image-card')
      .filter({ hasText: BANNER_IMAGES[1].caption })
      .click();
    await expect(explorer).toHaveCount(0);
    await page.getByLabel('Title:').fill(title);
    await page.getByLabel('Content:').fill('Posted by the **end-to-end** suite.');
    await expect(page.locator('lcc-markdown-renderer strong')).toHaveText('end-to-end');
    const published = page.waitForResponse(
      response =>
        response.url() === `${APP_API}/articles` &&
        response.request().method() === 'POST',
      { timeout: RESPONSE_TIMEOUT },
    );
    await page.getByRole('button', { name: 'Publish article' }).click();
    await confirm(page, 'Publish');

    expect((await published).status()).toBe(201);
    await page.goto('/news');
    await page.getByRole('textbox', { name: 'Search' }).fill(title);
    const card = page.getByRole('link', { name: new RegExp(title) });
    await expect(card).toBeVisible();

    await card.click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    const articleId = page.url().split('/').pop()!;
    await page.goto(`/article/edit/${articleId}`);
    await expect(page.getByLabel('Title:')).toHaveValue(title);
    await page.getByLabel('Title:').fill(`${title} (updated)`);
    const updated = page.waitForResponse(
      response =>
        response.url() === `${APP_API}/articles/${articleId}` &&
        response.request().method() === 'PUT',
      { timeout: RESPONSE_TIMEOUT },
    );
    await page.getByRole('button', { name: 'Update article' }).click();
    await confirm(page, 'Update');

    expect((await updated).status()).toBe(200);
    await page.goto(`/article/view/${articleId}`);
    await expect(page.getByRole('heading', { name: `${title} (updated)` })).toBeVisible();

    await page.goto('/news');
    await page.getByRole('textbox', { name: 'Search' }).fill(title);
    const updatedCard = page.getByRole('link', {
      name: new RegExp(`${title} \\(updated\\)`),
    });
    const controls = await openAdminControls(updatedCard);
    await controls.getByRole('button', { name: /^Delete / }).click();
    await expect(page.locator('lcc-dialog')).toContainText(`Delete ${title} (updated)?`);
    await confirm(page, 'Delete');

    await expect(updatedCard).toHaveCount(0);
    expect((await page.request.get(`${API}/articles/${articleId}`)).status()).toBe(404);
  });
});
