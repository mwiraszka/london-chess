import { expect, test } from '../fixtures';
import { ADMIN } from '../seed';
import { logIn, requireAdminCredentials } from './session';

test.describe('account page', () => {
  test.beforeEach(requireAdminCredentials);

  test("shows the member's own details and each settings section", async ({ page }) => {
    await logIn(page);

    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('link', { name: 'Account', exact: true }).click();

    await expect(page).toHaveURL(/\/account\/profile$/);
    await expect(page.getByRole('heading', { name: 'Account', level: 2 })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Personal information' }),
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'First name' })).toHaveValue(
      ADMIN.firstName,
    );
    await expect(page.getByRole('textbox', { name: 'Last name' })).toHaveValue(
      ADMIN.lastName,
    );
    await expect(page.getByRole('textbox', { name: 'City' })).toHaveValue(ADMIN.city);

    const sections = page.getByRole('navigation', { name: 'Account settings' });
    await sections.getByRole('link', { name: 'Security' }).click();

    await expect(page).toHaveURL(/\/account\/security$/);
    await expect(page.getByRole('heading', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Session management' })).toBeVisible();

    await sections.getByRole('link', { name: 'Danger zone' }).click();

    await expect(page).toHaveURL(/\/account\/danger$/);
    await expect(page.getByRole('heading', { name: 'Delete account' })).toBeVisible();
  });

  test('logs out from the menu', async ({ page }) => {
    await logIn(page);

    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByLabel('Log out', { exact: true }).click();

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByLabel('Log in', { exact: true })).toBeVisible();
    await page.goto('/account');
    await expect(page).not.toHaveURL(/\/account/);
  });
});
