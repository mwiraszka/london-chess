import { setupClerkTestingToken } from '@clerk/testing/playwright';

import { MISSING_CREDENTIALS_REASON, adminCredentials } from '../admin-credentials';
import { Locator, Page, expect, test } from '../fixtures';

export const API = 'http://localhost:3000/v1';

// Clerk accepts this code for any address containing +clerk_test on a development instance
const TEST_VERIFICATION_CODE = '424242';

// Missing credentials fail the whole run in CI from the global setup instead
export function requireAdminCredentials(): void {
  test.skip(!adminCredentials(), MISSING_CREDENTIALS_REASON);
}

/**
 * Logs in through the real form as the Clerk test account, which the seeded API links
 * to an admin member. Resolves the session token the app then sends to the API.
 */
export async function logIn(page: Page): Promise<string> {
  const { email, password } = adminCredentials()!;
  await setupClerkTestingToken({ page });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByLabel('Log in', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);

  const account = page.waitForResponse(
    response =>
      response.url() === `${API}/users/me` && response.request().method() === 'GET',
  );
  await page.getByRole('button', { name: 'Log in' }).click();

  // A device Clerk has not seen before may be asked for an emailed code first
  const needsCode = page
    .getByText('We sent a verification code to')
    .waitFor()
    .then(
      () => true,
      () => false,
    );
  if (await Promise.race([needsCode, account.then(() => false)])) {
    await page.getByRole('textbox', { name: 'Digit 1 of 6' }).click();
    await page.keyboard.type(TEST_VERIFICATION_CODE);
  }

  const response = await account;
  expect(response.status()).toBe(200);
  await expect(page.locator('lcc-login-form')).toHaveCount(0);
  return response.request().headers()['authorization'];
}

// Right-clicking an item is how an admin brings up its edit and delete controls
export async function openAdminControls(item: Locator): Promise<Locator> {
  await item.click({ button: 'right' });
  const controls = item.page().locator('lcc-admin-controls');
  await expect(controls).toBeVisible();
  return controls;
}

export async function confirm(page: Page, button: string): Promise<void> {
  const dialog = page.locator('lcc-dialog');
  await dialog.getByRole('button', { name: button, exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}`;
}
