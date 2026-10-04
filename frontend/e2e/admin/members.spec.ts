import { Page, expect, test } from '../fixtures';
import { bodyRows } from '../tables';
import { fieldError, fieldLabel, watchWrites } from './fields';
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

async function openNewMemberForm(page: Page): Promise<void> {
  await page.goto('/members');
  await page.getByRole('link', { name: 'Add a member' }).click();
  await expect(page).toHaveURL(/\/member\/add$/);
}

test.describe('managing members', () => {
  test.beforeEach(requireAdminCredentials);

  test('adds, edits and deletes a member', async ({ page }) => {
    const lastName = uniqueName('Pemberly').replace(' ', '-');
    await logIn(page);

    await openNewMemberForm(page);
    await page.getByLabel(fieldLabel('First name')).fill('Imogen');
    await page.getByLabel(fieldLabel('Last name')).fill(lastName);
    await page.getByLabel(fieldLabel('City')).fill('Strathroy');
    await page.getByLabel(fieldLabel('LCC rating')).fill('1432');
    const added = page.waitForResponse(
      response =>
        response.url().startsWith(`${APP_API}/admin/members`) &&
        response.request().method() === 'POST',
      { timeout: RESPONSE_TIMEOUT },
    );
    await page.getByRole('button', { name: 'Add member' }).click();
    await expect(page.locator('lcc-basic-dialog')).toContainText(
      `Add Imogen ${lastName}?`,
    );
    await confirm(page, 'Add');

    expect((await added).status()).toBe(201);
    let row = await findMember(page, lastName);
    await expect(row).toContainText('Strathroy');

    let controls = await openAdminControls(row);
    await controls.getByRole('link', { name: /^Edit / }).click();
    await expect(page).toHaveURL(/\/member\/edit\/[0-9a-f]{24}$/);
    await expect(page.getByLabel(fieldLabel('Last name'))).toHaveValue(lastName);
    // Opening a member is not an edit, so there is nothing to save or discard yet
    await expect(page.getByRole('button', { name: 'Update member' })).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Revert', exact: true }),
    ).toBeDisabled();
    await page.getByLabel(fieldLabel('City')).fill('Komoka');
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
    await expect(page.locator('lcc-basic-dialog')).toContainText(
      `Delete Imogen ${lastName}?`,
    );
    await confirm(page, 'Delete');

    await expect(page.getByText('No members match these filters.')).toBeVisible();
  });

  test('shows what is wrong instead of saving an incomplete member', async ({ page }) => {
    await logIn(page);
    const writes = watchWrites(page, `${APP_API}/admin/members`);

    await openNewMemberForm(page);
    await expect(page.locator('lcc-member-form').getByRole('alert')).toHaveCount(0);
    await page.getByLabel(fieldLabel('First name')).fill('Imogen');
    await page.getByLabel(fieldLabel('Last name')).focus();
    await page.getByLabel(fieldLabel('LCC rating')).fill('15OO');
    await page.getByLabel(fieldLabel('City')).focus();
    await expect(fieldError(page, 'LCC rating')).toHaveText(
      'Enter a rating such as 1500, or 1500/7 for a provisional rating',
    );
    await expect(fieldError(page, 'Last name')).toHaveText('This field is required');
    await expect(page.getByRole('button', { name: 'Add member' })).toBeDisabled();

    await page.getByLabel(fieldLabel('LCC rating')).fill('1500/7');
    await page.getByLabel(fieldLabel('Last name')).fill('Pemberly');
    await expect(fieldError(page, 'LCC rating')).toHaveCount(0);
    await expect(fieldError(page, 'Last name')).toHaveCount(0);
    await page.getByRole('button', { name: 'Add member' }).click();
    await expect(page.locator('lcc-basic-dialog')).toContainText('Add Imogen Pemberly?');
    await page
      .locator('lcc-basic-dialog')
      .getByRole('button', { name: 'Cancel' })
      .click();

    expect(writes).toEqual([]);
    await page.getByRole('button', { name: 'Revert', exact: true }).click();
    await confirm(page, 'Revert');
  });

  test('keeps a new member draft, with its errors, through a reload', async ({
    page,
  }) => {
    await logIn(page);

    await openNewMemberForm(page);
    await page.getByLabel(fieldLabel('City')).fill('');
    // Revert enables once a draft reaches the store, which confirms only the first change
    await expect(page.getByRole('button', { name: 'Revert', exact: true })).toBeEnabled();
    await page.reload();

    await expect(page).toHaveURL(/\/member\/add$/);
    await expect(page.getByLabel(fieldLabel('City'))).toHaveValue('');
    await expect(fieldError(page, 'City')).toHaveText('This field is required');

    await page.getByRole('button', { name: 'Revert', exact: true }).click();
    await confirm(page, 'Revert');

    await expect(page.getByLabel(fieldLabel('City'))).toHaveValue('London');
    await expect(
      page.getByRole('button', { name: 'Revert', exact: true }),
    ).toBeDisabled();
  });
});
