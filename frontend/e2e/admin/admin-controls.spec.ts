import { expect, test } from '../fixtures';
import { ARTICLES, PROFILE_MEMBER, UPCOMING_EVENTS } from '../seed';
import { setSwitch } from '../switches';
import { bodyRows } from '../tables';
import { fieldLabel } from './fields';
import { logIn, openAdminControls, requireAdminCredentials } from './session';

test.describe('admin controls', () => {
  test.beforeEach(requireAdminCredentials);

  test.beforeEach(async ({ page }) => {
    await logIn(page);
  });

  test('offer editing and deleting an article from its card', async ({ page }) => {
    await page.goto('/news');

    const controls = await openAdminControls(
      page.getByRole('link', { name: new RegExp(ARTICLES[1].title) }),
    );

    // Delete only appears while Ctrl is held, so it is hard to hit by accident
    await expect(controls.getByRole('button', { name: /^Delete / })).toHaveCount(0);
    await page.keyboard.down('Control');
    await expect(controls.getByRole('button', { name: /^Delete / })).toBeEnabled();
    await page.keyboard.up('Control');
    await expect(controls.getByRole('button', { name: /bookmark/i })).toBeVisible();
    await controls.getByRole('link', { name: /^Edit / }).click();
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

    await controls.getByRole('link', { name: /^Edit / }).click();
    await expect(page).toHaveURL(new RegExp(`/event/edit/${UPCOMING_EVENTS[0].id}$`));
  });

  test('offer editing a member from the members table', async ({ page }) => {
    await page.goto('/members');
    await page.getByRole('textbox', { name: 'Search' }).fill(PROFILE_MEMBER.lastName);
    const row = bodyRows(page.getByRole('table', { name: 'Members' }));
    await expect(row).toHaveCount(1);

    const controls = await openAdminControls(row);

    await controls.getByRole('link', { name: /^Edit / }).click();
    await expect(page).toHaveURL(/\/member\/edit\/[0-9a-f]{24}$/);
    await expect(page.getByLabel(fieldLabel('Last name'))).toHaveValue(
      PROFILE_MEMBER.lastName,
    );
  });

  test('show the admin toolbar on each managed page', async ({ page }) => {
    for (const [path, link] of [
      ['/news', 'Create an article'],
      ['/schedule', 'Add an event'],
      ['/members', 'Add a member'],
      ['/photo-gallery', 'Create an album'],
      ['/tournaments', 'Add a tournament'],
    ]) {
      await page.goto(path);

      await expect(
        page.locator('lcc-admin-toolbar').getByRole('link', { name: link }),
      ).toBeVisible();
    }
  });

  test('leave the app as any other member sees it while switched off', async ({
    page,
  }) => {
    const toolbarLink = page
      .locator('lcc-admin-toolbar')
      .getByRole('link', { name: 'Add an event' });
    const setAdminControls = async (on: boolean): Promise<void> => {
      await page.getByRole('button', { name: 'Menu' }).click();
      await setSwitch(page, 'Admin controls', on);
      await page.keyboard.press('Escape');
    };
    await page.goto('/schedule');
    await expect(toolbarLink).toBeVisible();

    await setAdminControls(false);

    await expect(toolbarLink).toHaveCount(0);
    await page.goto('/event/add');
    await expect(page).not.toHaveURL(/\/event\/add$/);

    await setAdminControls(true);
    await page.goto('/schedule');

    await expect(toolbarLink).toBeVisible();
  });
});
