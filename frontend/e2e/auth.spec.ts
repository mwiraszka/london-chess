import { Page, expect, test } from './fixtures';

async function openLogin(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByLabel('Log in', { exact: true }).click();
}

test.describe('logging in and creating an account', () => {
  test('explains a failed log in in a full sentence', async ({ page }) => {
    await openLogin(page);

    await page
      .getByRole('textbox', { name: 'Email' })
      .fill('no-such-member+clerk_test@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('not-the-password');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.locator('lcc-login-form').getByRole('alert')).toHaveText(
      'Incorrect email or password.',
    );
  });

  test('explains a wrong verification code in a full sentence', async ({ page }) => {
    await openLogin(page);
    await page.getByRole('button', { name: 'Create account' }).click();

    await page.getByRole('textbox', { name: 'First name' }).fill('Quentin');
    await page.getByRole('textbox', { name: 'Last name' }).fill('Ashby');
    await page
      .getByRole('textbox', { name: 'Email' })
      .fill(`quentin-${Date.now()}@example.com`);
    await page.getByRole('textbox', { name: 'City' }).fill('London');
    await page.getByLabel('Year of birth').fill('1990');
    await page.getByRole('button', { name: 'Request account' }).click();
    await expect(page.getByText(/Enter the six-digit code we sent to/)).toBeVisible();

    await page.getByRole('textbox', { name: 'Digit 1 of 6' }).click();
    await page.keyboard.type('000000');
    await page.getByRole('button', { name: 'Verify and submit' }).click();

    await expect(
      page
        .locator('lcc-create-account-form')
        .getByText('That verification code is incorrect.', { exact: true }),
    ).toBeVisible();
  });
});
