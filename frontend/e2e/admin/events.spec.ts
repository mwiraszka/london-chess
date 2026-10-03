import { Page, expect, test } from '../fixtures';
import { setSwitch } from '../switches';
import { fieldLabel, fillField, nextMonthOn } from './fields';
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

async function findInList(page: Page, title: string) {
  await page.goto('/schedule');
  await setSwitch(page, 'Calendar view', false);
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
    await fillField(page, 'Event date', nextMonthOn(15));
    await fillField(page, 'Event time', '7:00 PM');
    await page.getByLabel(fieldLabel('Title')).fill(title);
    await page.getByLabel(fieldLabel('Details')).fill('Rook endings for club players.');
    // The radio itself is visually hidden behind its label, which is what takes the click
    await page.locator('lcc-event-form').getByText('Lecture', { exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Lecture' })).toBeChecked();
    const added = page.waitForResponse(
      response =>
        response.url() === `${APP_API}/events` && response.request().method() === 'POST',
      { timeout: RESPONSE_TIMEOUT },
    );
    await page.getByRole('button', { name: 'Add event' }).click();
    await confirm(page, 'Add');

    expect((await added).status()).toBe(201);
    const listed = await findInList(page, title);
    await expect(listed).toBeVisible();

    let controls = await openAdminControls(listed);
    await controls.getByRole('link', { name: /^Edit / }).click();
    await expect(page).toHaveURL(/\/event\/edit\/[0-9a-f]{24}$/);
    await expect(page.getByLabel(fieldLabel('Title'))).toHaveValue(title);
    await page
      .getByLabel(fieldLabel('Details'))
      .fill('Rook and pawn endings for club players.');
    const updated = page.waitForResponse(
      response =>
        response.url().startsWith(`${APP_API}/events/`) &&
        response.request().method() === 'PUT',
      { timeout: RESPONSE_TIMEOUT },
    );
    await page.getByRole('button', { name: 'Update event' }).click();
    await confirm(page, 'Update');

    expect((await updated).status()).toBe(200);
    const edited = await findInList(page, title);
    await expect(page.locator('lcc-events-table')).toContainText('Rook and pawn endings');

    controls = await openAdminControls(edited);
    await clickDelete(controls);
    await expect(page.locator('lcc-basic-dialog')).toContainText(`Delete ${title}?`);
    await confirm(page, 'Delete');

    await expect(edited).toHaveCount(0);
  });
});
