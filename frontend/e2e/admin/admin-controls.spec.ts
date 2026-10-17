import { expect, test } from '../fixtures';
import { ARTICLES, PROFILE_MEMBER, UPCOMING_EVENTS } from '../seed';
import { setSwitch } from '../switches';
import { bodyRows } from '../tables';
import { fieldLabel } from './fields';
import {
  logIn,
  openAdminActions,
  openAdminControls,
  requireAdminCredentials,
} from './session';

test.describe('admin controls', () => {
  test.beforeEach(requireAdminCredentials);

  test.beforeEach(async ({ page }) => {
    await logIn(page);
  });

  test('offer editing and deleting an article from its card', async ({ page }) => {
    await page.goto('/articles');

    const controls = await openAdminControls(
      page.getByRole('link', { name: new RegExp(ARTICLES[1].title) }),
    );

    await expect(controls.getByRole('menuitem', { name: 'Delete' })).toBeEnabled();
    await expect(controls.getByRole('menuitem', { name: /bookmark/i })).toBeVisible();
    await controls.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page).toHaveURL(new RegExp(`/article/edit/${ARTICLES[1].id}$`));
    await expect(page.getByLabel(fieldLabel('Title'))).toHaveValue(ARTICLES[1].title);
  });

  test('offer editing an event from the schedule list', async ({ page }) => {
    await page.goto('/schedule');
    await setSwitch(page, 'Calendar view', false);

    const controls = await openAdminControls(
      page
        .locator('lcc-events-table')
        .getByRole('heading', { name: UPCOMING_EVENTS[0].title, exact: true }),
    );

    await controls.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page).toHaveURL(new RegExp(`/event/edit/${UPCOMING_EVENTS[0].id}$`));
  });

  test('offer editing a member from the members table', async ({ page }) => {
    await page.goto('/members');
    await page.getByRole('textbox', { name: 'Search' }).fill(PROFILE_MEMBER.lastName);
    const row = bodyRows(page.getByRole('table', { name: 'Members' }));
    await expect(row).toHaveCount(1);

    const controls = await openAdminControls(row);

    await controls.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page).toHaveURL(/\/member\/edit\/[0-9a-f]{24}$/);
    await expect(page.getByLabel(fieldLabel('Last name'))).toHaveValue(
      PROFILE_MEMBER.lastName,
    );
  });

  test("offer each managed page's actions from the admin actions button", async ({
    page,
  }) => {
    for (const [path, action] of [
      ['/articles', 'Add article'],
      ['/schedule', 'Add event'],
      ['/members', 'Add member'],
      ['/photo-gallery', 'Add album'],
      ['/tournaments', 'Add tournament'],
    ]) {
      await page.goto(path);

      const actions = await openAdminActions(page);

      await expect(actions.getByRole('menuitem', { name: action })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});
