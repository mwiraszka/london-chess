import { Locator, Page } from '../fixtures';

// The editors label a field as "* Title:" beside it, with the text on a line of its own
export const fieldLabel = (label: string): RegExp =>
  new RegExp(`^\\s*(\\*\\s*)?${label}:?\\s*$`);

// Date and time pickers read what is typed once the entry is committed with Enter
export async function fillField(page: Page, label: string, value: string): Promise<void> {
  const field = page.getByLabel(fieldLabel(label));
  await field.fill(value);
  await field.press('Enter');
}

// The date picker's own aria-label hides the label beside it, so it is found by id
export async function fillDate(page: Page, id: string, value: string): Promise<void> {
  const field = page.locator(`#${id}`);
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
