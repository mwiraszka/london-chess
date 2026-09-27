import { Page, expect, test } from './fixtures';
import {
  ADMIN,
  CITY_CHAMPION,
  INACTIVE_MEMBER,
  OTHER_MEMBERS,
  PROFILE_MEMBER,
  RIVAL_MEMBER,
} from './seed';
import { flipSwitch } from './switches';
import { bodyRows } from './tables';

function memberRows(page: Page) {
  return bodyRows(page.getByRole('table', { name: 'Members' }));
}

function memberRow(page: Page, firstName: string, lastName: string) {
  return memberRows(page).filter({ hasText: `${firstName} ${lastName}` });
}

async function search(page: Page, text: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Search' }).fill(text);
}

test.describe('members', () => {
  test('ranks active members by rating', async ({ page }) => {
    await page.goto('/members');

    await expect(memberRows(page).first()).toContainText(
      `${CITY_CHAMPION.firstName} ${CITY_CHAMPION.lastName}`,
    );
    await expect(
      memberRow(page, INACTIVE_MEMBER.firstName, INACTIVE_MEMBER.lastName),
    ).toHaveCount(0);
    await expect(page.locator('ea-paginator')).toContainText(/1–\d+ of \d+/);
  });

  test('pages through the members', async ({ page }) => {
    await page.goto('/members');
    await page.getByRole('combobox', { name: 'Rows per page:' }).selectOption('10');
    await expect(memberRows(page)).toHaveCount(10);
    const firstPage = await memberRows(page).allTextContents();

    await page.getByRole('button', { name: 'Go to page 2' }).click();

    await expect(page.locator('ea-paginator')).toContainText(/11–\d+ of \d+/);
    await expect(memberRows(page).first()).not.toHaveText(firstPage[0]);
  });

  test('finds members by name and city', async ({ page }) => {
    await page.goto('/members');

    await search(page, PROFILE_MEMBER.lastName);

    await expect(memberRows(page)).toHaveCount(1);
    await expect(memberRows(page)).toContainText(PROFILE_MEMBER.city);

    await search(page, PROFILE_MEMBER.city);

    await expect(memberRows(page)).toHaveCount(1);
    await expect(memberRows(page)).toContainText(PROFILE_MEMBER.lastName);
  });

  test('includes inactive members once asked to', async ({ page }) => {
    await page.goto('/members');
    await search(page, INACTIVE_MEMBER.lastName);
    await expect(page.getByText('No members match these filters.')).toBeVisible();

    await flipSwitch(page, 'Show inactive members');

    await expect(
      memberRow(page, INACTIVE_MEMBER.firstName, INACTIVE_MEMBER.lastName),
    ).toHaveCount(1);

    await page.getByRole('button', { name: 'Clear filters' }).click();

    await expect(page.getByRole('textbox', { name: 'Search' })).toHaveValue('');
    await expect(
      memberRow(page, INACTIVE_MEMBER.firstName, INACTIVE_MEMBER.lastName),
    ).toHaveCount(0);
  });

  test('sorts members by name', async ({ page }) => {
    await page.goto('/members');

    await page.getByRole('button', { name: 'Name', exact: true }).click();

    const [first] = [
      ...[...OTHER_MEMBERS, ADMIN, PROFILE_MEMBER, RIVAL_MEMBER]
        .filter(member => member.isActive)
        .map(member => member.lastName),
      CITY_CHAMPION.lastName,
    ].sort((a, b) => a.localeCompare(b));
    await expect(memberRows(page).first()).toContainText(first);
  });

  test('links members with a profile to it', async ({ page }) => {
    await page.goto('/members');

    await memberRow(page, PROFILE_MEMBER.firstName, PROFILE_MEMBER.lastName)
      .getByRole('link')
      .first()
      .click();

    await expect(page).toHaveURL(new RegExp(`/members/${PROFILE_MEMBER.number}$`));
  });
});
