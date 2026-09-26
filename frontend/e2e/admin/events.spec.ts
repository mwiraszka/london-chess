import { Page, expect, test } from '../fixtures';
import { flipSwitch } from '../switches';
import {
  API,
  confirm,
  logIn,
  openAdminControls,
  requireAdminCredentials,
  uniqueName,
} from './session';

async function findInList(page: Page, title: string) {
  await page.goto('/schedule');
  await flipSwitch(page, 'Calendar view');
  await page.getByRole('textbox', { name: 'Search' }).fill(title);
  return page
    .locator('lcc-events-table')
    .getByRole('heading', { name: title, exact: true });
}

test.describe('managing events', () => {
  test.beforeEach(requireAdminCredentials);

  test('adds, edits and deletes an event', async ({ page }) => {
    const title = uniqueName('Endgame workshop');
    await logIn(page);

    await page.goto('/schedule');
    await page.getByRole('link', { name: 'Add an event' }).click();
    await expect(page).toHaveURL(/\/event\/add$/);
    await page.locator('lcc-date-picker .next-month-button').click();
    await page
      .locator('lcc-date-picker td:not([disabled])')
      .filter({ hasText: /^\s*15\s*$/ })
      .click();
    await page.getByLabel('Event time:').fill('7:00 PM');
    await page.getByLabel('Title:').fill(title);
    await page.getByLabel('Details:').fill('Rook endings for club players.');
    await page.getByLabel('Lecture', { exact: true }).check();
    const added = page.waitForResponse(
      response =>
        response.url() === `${API}/events` && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Add event' }).click();
    await confirm(page, 'Add');

    expect((await added).status()).toBe(201);
    const listed = await findInList(page, title);
    await expect(listed).toBeVisible();

    let controls = await openAdminControls(listed);
    await controls.getByRole('link', { name: /^Edit / }).click();
    await expect(page).toHaveURL(/\/event\/edit\/[0-9a-f]{24}$/);
    await expect(page.getByLabel('Title:')).toHaveValue(title);
    await page.getByLabel('Details:').fill('Rook and pawn endings for club players.');
    const updated = page.waitForResponse(
      response =>
        response.url().startsWith(`${API}/events/`) &&
        response.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Update event' }).click();
    await confirm(page, 'Update');

    expect((await updated).status()).toBe(200);
    const edited = await findInList(page, title);
    await expect(page.locator('lcc-events-table')).toContainText('Rook and pawn endings');

    controls = await openAdminControls(edited);
    await controls.getByRole('button', { name: /^Delete / }).click();
    await expect(page.locator('lcc-dialog')).toContainText(`Delete ${title}?`);
    await confirm(page, 'Delete');

    await expect(edited).toHaveCount(0);
  });
});
