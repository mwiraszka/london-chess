import { Page, expect, test } from '../fixtures';
import { BANNER_IMAGES } from '../seed';
import { fieldError, fieldLabel, leaveAndReturn, watchWrites } from './fields';
import {
  API,
  APP_API,
  RESPONSE_TIMEOUT,
  clickDelete,
  confirm,
  logIn,
  openAdminControls,
  requireAdminCredentials,
  uniqueName,
} from './session';

async function openNewArticleForm(page: Page): Promise<void> {
  await page.goto('/news');
  await page.getByRole('link', { name: 'Create an article' }).click();
  await expect(page).toHaveURL(/\/article\/add$/);
}

async function chooseFromExplorer(page: Page, caption: string): Promise<void> {
  const explorer = page.locator('lcc-image-explorer');
  await explorer.locator('.image-card').filter({ hasText: caption }).click();
  await expect(explorer).toHaveCount(0);
}

test.describe('managing articles', () => {
  test.beforeEach(requireAdminCredentials);

  test('publishes, edits and deletes an article', async ({ page }) => {
    const title = uniqueName('Club notice');
    await logIn(page);

    await openNewArticleForm(page);
    await page.getByRole('button', { name: 'Select a new banner image' }).click();
    await chooseFromExplorer(page, BANNER_IMAGES[1].caption);
    await page.getByLabel(fieldLabel('Title')).fill(title);
    await page
      .getByLabel(fieldLabel('Content'))
      .fill('Posted by the **end-to-end** suite.');
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
    // The card holds the title as a heading too, so the address shows the navigation is done
    await expect(page).toHaveURL(/\/article\/view\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    const articleId = page.url().split('/').pop()!;
    await page.goto(`/article/edit/${articleId}`);
    await expect(page.getByLabel(fieldLabel('Title'))).toHaveValue(title);
    await expect(page.getByRole('button', { name: 'Update article' })).toBeDisabled();
    await page.getByLabel(fieldLabel('Title')).fill(`${title} (updated)`);
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
    await clickDelete(controls);
    await expect(page.locator('lcc-basic-dialog')).toContainText(
      `Delete ${title} (updated)?`,
    );
    await confirm(page, 'Delete');

    await expect(updatedCard).toHaveCount(0);
    expect((await page.request.get(`${API}/articles/${articleId}`)).status()).toBe(404);
  });

  test('holds back an incomplete article until it has everything it needs', async ({
    page,
  }) => {
    await logIn(page);
    const writes = watchWrites(page, `${APP_API}/articles`);
    const publish = page.getByRole('button', { name: 'Publish article' });

    await openNewArticleForm(page);
    await expect(page.locator('lcc-article-form').getByRole('alert')).toHaveCount(0);
    await page.getByLabel(fieldLabel('Title')).fill(uniqueName('Unfinished notice'));
    await page.getByLabel(fieldLabel('Content')).focus();
    await page.getByLabel(fieldLabel('Title')).focus();

    await expect(fieldError(page, 'Content')).toHaveText('This field is required');
    await expect(publish).toBeDisabled();

    await page.getByRole('button', { name: 'Select a new banner image' }).click();
    await chooseFromExplorer(page, BANNER_IMAGES[0].caption);
    await page.getByLabel(fieldLabel('Content')).fill('Ready to go.');
    await expect(fieldError(page, 'Content')).toHaveCount(0);
    await expect(publish).toBeEnabled();

    expect(writes).toEqual([]);
    await page.getByRole('button', { name: 'Revert', exact: true }).click();
    await confirm(page, 'Revert');
  });

  test('keeps an article draft, with its errors, through leaving the page', async ({
    page,
  }) => {
    const title = uniqueName('Draft notice');
    await logIn(page);

    await openNewArticleForm(page);
    await page.getByLabel(fieldLabel('Title')).fill(title);
    await page.getByLabel(fieldLabel('Content')).fill('Half **written**.');
    // The draft reaches the store a moment after typing stops, which enables Revert
    await expect(page.getByRole('button', { name: 'Revert', exact: true })).toBeEnabled();
    await leaveAndReturn(page);

    await expect(page).toHaveURL(/\/article\/add$/);
    await expect(page.getByLabel(fieldLabel('Title'))).toHaveValue(title);
    await expect(page.getByLabel(fieldLabel('Content'))).toHaveValue('Half **written**.');
    await expect(page.locator('lcc-markdown-renderer strong')).toHaveText('written');
    await expect(page.getByText('Choose a banner image')).toBeVisible();

    await page.getByRole('button', { name: 'Revert', exact: true }).click();
    await confirm(page, 'Revert');

    await expect(page.getByLabel(fieldLabel('Title'))).toHaveValue('');
    await expect(page.locator('lcc-markdown-renderer')).toHaveCount(0);
  });

  test('inserts a body image where the cursor was left', async ({ page }) => {
    await logIn(page);

    await openNewArticleForm(page);
    const content = page.getByLabel(fieldLabel('Content'));
    await content.fill('Opening.\nClosing.');
    await content.focus();
    await content.evaluate((textarea: HTMLTextAreaElement) =>
      textarea.setSelectionRange(8, 8),
    );
    await page.getByRole('button', { name: 'Insert image' }).click();
    await chooseFromExplorer(page, BANNER_IMAGES[1].caption);

    await expect(content).toHaveValue(
      `Opening.\n\n{{{${BANNER_IMAGES[1].id}}}}(((500)))<<<Image caption goes here>>>\n\n\nClosing.`,
    );

    await page.getByRole('button', { name: 'Revert', exact: true }).click();
    await confirm(page, 'Revert');
  });
});
