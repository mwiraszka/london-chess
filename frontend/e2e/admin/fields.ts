import { Locator, Page, expect } from '../fixtures';
import { confirm } from './session';

// The editors label a field as "* Title:" beside it, with the text on a line of its own
export const fieldLabel = (label: string): RegExp =>
  new RegExp(`^\\s*(\\*\\s*)?${label}:?\\s*$`);

// Date and time pickers read what is typed once the entry is committed with Enter
export async function fillField(page: Page, label: string, value: string): Promise<void> {
  const field = page.getByLabel(fieldLabel(label));
  await field.fill(value);
  await field.press('Enter');
}

// A day in the coming month, written as the date pickers read it
export function nextMonthOn(day: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, day);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${String(day).padStart(2, '0')}`;
}

// The message a field shows beneath itself once it has an error to show
export function fieldError(page: Page, label: string): Locator {
  return page
    .locator('ea-input, ea-textarea, ea-autocomplete, ea-date-picker')
    .filter({ has: page.getByLabel(fieldLabel(label)) })
    .getByRole('alert');
}

// Collects the requests that would change data under an address, so a test can show
// that an invalid form never reached the API
export function watchWrites(page: Page, url: string): string[] {
  const writes: string[] = [];
  page.on('request', request => {
    if (request.url().startsWith(url) && request.method() !== 'GET') {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });
  return writes;
}

// Leaves an editor for the news page past the unsaved changes prompt, then comes back
export async function leaveAndReturn(page: Page): Promise<void> {
  await page
    .locator('lcc-navigation-bar')
    .getByRole('link', { name: 'News', exact: true })
    .click();
  await confirm(page, 'Leave');
  await expect(page).toHaveURL(/\/news$/);
  await page.goBack();
}
