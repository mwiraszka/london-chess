import { Page, expect } from '@playwright/test';

// The switch's track covers its input, so it is flipped the way a visitor does it
export async function flipSwitch(page: Page, name: string): Promise<void> {
  await page
    .locator('ea-switch')
    .filter({ hasText: name })
    .locator('.ea-switch__track')
    .click();
}

// Leaves the switch on or off whatever state an earlier visit saved
export async function setSwitch(page: Page, name: string, on: boolean): Promise<void> {
  const input = page.locator('ea-switch').filter({ hasText: name }).getByRole('switch');
  await expect(input).toBeVisible();
  if ((await input.isChecked()) !== on) {
    await flipSwitch(page, name);
  }
  await expect(input).toBeChecked({ checked: on });
}
