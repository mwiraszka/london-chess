import { Page, expect, test } from '../fixtures';
import { bodyRows } from '../tables';
import {
  APP_API,
  RESPONSE_TIMEOUT,
  clickDelete,
  confirm,
  logIn,
  openAdminControls,
  requireAdminCredentials,
  uniqueName,
} from './session';

async function findMember(page: Page, lastName: string) {
  await page.goto('/members');
  await page.getByRole('textbox', { name: 'Search' }).fill(lastName);
  const rows = bodyRows(page.getByRole('table', { name: 'Members' }));
  await expect(rows).toHaveCount(1);
  return rows.first();
}

test.describe('managing members', () => {
  test.beforeEach(requireAdminCredentials);

  test('adds, edits and deletes a member', async ({ page }) => {
    const lastName = uniqueName('Pemberly').replace(' ', '-');
    await logIn(page);

    await page.goto('/members');
    await page.getByRole('link', { name: 'Add a member' }).click();
    await expect(page).toHaveURL(/\/member\/add$/);
    await page.getByLabel('First name:').fill('Imogen');
    await page.getByLabel('Last name:').fill(lastName);
    await page.getByLabel('City:').fill('Strathroy');
    await page.getByLabel('LCC rating:').fill('1432');
    const added = page.waitForResponse(
      response =>
        response.url().startsWith(`${APP_API}/admin/members`) &&
        response.request().method() === 'POST',
      { timeout: RESPONSE_TIMEOUT },
    );
    await page.getByRole('button', { name: 'Add member' }).click();
    await expect(page.locator('lcc-dialog')).toContainText(`Add Imogen ${lastName}?`);
    await confirm(page, 'Add');

    expect((await added).status()).toBe(201);
    let row = await findMember(page, lastName);
    await expect(row).toContainText('Strathroy');

    let controls = await openAdminControls(row);
    await controls.getByRole('link', { name: /^Edit / }).click();
    await expect(page).toHaveURL(/\/member\/edit\/[0-9a-f]{24}$/);
    await expect(page.getByLabel('Last name:')).toHaveValue(lastName);
    await page.getByLabel('City:').fill('Komoka');
    const updated = page.waitForResponse(
      response =>
        response.url().startsWith(`${APP_API}/admin/members/`) &&
        response.request().method() === 'PUT',
      { timeout: RESPONSE_TIMEOUT },
    );
    await page.getByRole('button', { name: 'Update member' }).click();
    await confirm(page, 'Update');

    expect((await updated).status()).toBe(200);
    row = await findMember(page, lastName);
    await expect(row).toContainText('Komoka');

    controls = await openAdminControls(row);
    await clickDelete(controls);
    await expect(page.locator('lcc-dialog')).toContainText(`Delete Imogen ${lastName}?`);
    await confirm(page, 'Delete');

    await expect(page.getByText('No members match these filters.')).toBeVisible();
  });
});
