import { Page } from '@playwright/test';

// The switch's track covers its input, so it is flipped the way a visitor does it
export async function flipSwitch(page: Page, name: string): Promise<void> {
  await page
    .locator('ea-switch')
    .filter({ hasText: name })
    .locator('.ea-switch__track')
    .click();
}
