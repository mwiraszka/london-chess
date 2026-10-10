import { Page, expect, test } from '../fixtures';
import { ADMIN, PROFILE_MEMBER, RIVAL_MEMBER, UPCOMING } from '../seed';
import { fieldError, fieldLabel, fillField, nextMonthOn } from './fields';
import {
  APP_API,
  RESPONSE_TIMEOUT,
  confirm,
  logIn,
  requireAdminCredentials,
  uniqueName,
} from './session';

const NEWCOMER = 'Newcomer, Nora';

// Three players over two rounds, as SwissSys exports them
const STANDINGS_CSV = [
  '#,Name,Rating,Rd 1,Rd 2,Total',
  `1,"${PROFILE_MEMBER.lastName}, ${PROFILE_MEMBER.firstName}",1850,W2 (w),W3 (b),2.0`,
  `2,"${RIVAL_MEMBER.lastName}, ${RIVAL_MEMBER.firstName}",1790,L1 (b),H---,0.5`,
  `3,"${NEWCOMER}",unr.,H---,L1 (w),0.5`,
].join('\n');

function standingsFile(content: string) {
  return { name: 'Standings.csv', mimeType: 'text/csv', buffer: Buffer.from(content) };
}

async function importStandings(page: Page, content: string): Promise<void> {
  await page
    .locator('lcc-tournament-form ea-file-uploader input[type="file"]')
    .setInputFiles(standingsFile(content));
}

function waitForSave(page: Page, method: 'POST' | 'PUT' | 'DELETE') {
  return page.waitForResponse(
    response =>
      response.url().startsWith(`${APP_API}/tournaments`) &&
      response.request().method() === method,
    { timeout: RESPONSE_TIMEOUT },
  );
}

test.describe('managing tournaments', () => {
  test.beforeEach(requireAdminCredentials);

  test('adds a tournament with imported results, then edits and deletes it', async ({
    page,
  }) => {
    const name = uniqueName('Autumn Rapid');
    await logIn(page);

    await page.goto('/tournaments');
    await page.getByRole('link', { name: 'Add a tournament' }).click();
    await expect(page).toHaveURL(/\/tournament\/add$/);
    await page.getByLabel(fieldLabel('Name')).fill(name);
    await fillField(page, 'Start date', nextMonthOn(10));
    await page.getByLabel(fieldLabel('Time control')).fill('G25+5');
    await importStandings(page, STANDINGS_CSV);

    const preview = page.getByRole('table', { name: 'Imported standings' });
    await expect(preview).toContainText(
      `${PROFILE_MEMBER.lastName}, ${PROFILE_MEMBER.firstName}`,
    );
    await expect(preview.getByRole('row').filter({ hasText: NEWCOMER })).toContainText(
      'New',
    );
    await expect(page.getByText('One player is not in the archive yet')).toBeVisible();

    const added = waitForSave(page, 'POST');
    await page.getByRole('button', { name: 'Add tournament' }).click();
    await confirm(page, 'Add');

    const response = await added;
    expect(response.status()).toBe(201);
    const { data: number } = await response.json();
    await expect(page).toHaveURL(new RegExp(`/tournaments/${number}$`));
    await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Standings' })).toContainText(NEWCOMER);

    await page.getByRole('link', { name: 'Edit this tournament' }).click();
    await expect(page).toHaveURL(new RegExp(`/tournament/edit/${number}$`));
    await expect(page.getByLabel(fieldLabel('Name'))).toHaveValue(name);
    await page.getByLabel(fieldLabel('Name')).fill(`${name} Open`);
    const updated = waitForSave(page, 'PUT');
    await page.getByRole('button', { name: 'Update tournament' }).click();
    await confirm(page, 'Update');

    expect((await updated).status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: `${name} Open`, level: 2 }),
    ).toBeVisible();

    const deleted = waitForSave(page, 'DELETE');
    await page.getByRole('button', { name: 'Delete this tournament' }).click();
    await confirm(page, 'Delete');

    expect((await deleted).status()).toBe(200);
    await expect(page).toHaveURL(/\/tournaments$/);
    await expect(page.getByRole('table', { name: 'Tournaments' })).not.toContainText(
      name,
    );
  });

  test('names every problem in standings it cannot import', async ({ page }) => {
    await logIn(page);
    await page.goto('/tournament/add');

    await importStandings(page, STANDINGS_CSV.replace('W3 (b)', 'W3x'));

    const problems = page.locator('.results__problems');
    await expect(problems).toContainText('These standings could not be imported');
    await expect(problems).toContainText('"W3x" is not a result the importer can read.');
    await expect(page.getByRole('table', { name: 'Imported standings' })).toHaveCount(0);
  });

  test('keeps a draft through a reload until it is discarded', async ({ page }) => {
    const name = uniqueName('Draft Blitz');
    await logIn(page);
    await page.goto('/tournament/add');

    await page.getByLabel(fieldLabel('Name')).fill(name);
    // Revert enables once a draft reaches the store, which confirms only the first change
    await expect(page.getByRole('button', { name: 'Revert', exact: true })).toBeEnabled();
    await page.reload();

    await expect(page.getByLabel(fieldLabel('Name'))).toHaveValue(name);

    await page.getByRole('button', { name: 'Revert', exact: true }).click();
    await confirm(page, 'Revert');

    await expect(page.getByLabel(fieldLabel('Name'))).toHaveValue('');
  });

  test('reveals what is missing instead of saving an incomplete tournament', async ({
    page,
  }) => {
    await logIn(page);
    await page.goto('/tournament/add');
    await page.getByLabel(fieldLabel('Name')).focus();
    await page.getByLabel(fieldLabel('Time control')).fill('G10');

    await expect(fieldError(page, 'Name')).toHaveText('This field is required');
    await expect(page.getByRole('button', { name: 'Add tournament' })).toBeDisabled();
  });
});

test.describe('registering for a tournament', () => {
  test.beforeEach(requireAdminCredentials);

  test('registers the signed-in member and lets them withdraw', async ({ page }) => {
    await logIn(page);
    await page.goto(`/tournaments/${UPCOMING.number}`);
    const registration = page.locator('.registration');
    const adminName = `${ADMIN.firstName} ${ADMIN.lastName}`;

    const registered = page.waitForResponse(
      response =>
        response.url() === `${APP_API}/tournaments/${UPCOMING.number}/registration` &&
        response.request().method() === 'POST',
      { timeout: RESPONSE_TIMEOUT },
    );
    await registration.getByRole('button', { name: 'Register', exact: true }).click();

    expect((await registered).status()).toBe(200);
    await expect(registration).toContainText('You are registered.');
    await expect(
      registration.getByRole('list', { name: 'Registered players' }),
    ).toContainText(adminName);

    const withdrawn = page.waitForResponse(
      response =>
        response.url() === `${APP_API}/tournaments/${UPCOMING.number}/registration` &&
        response.request().method() === 'DELETE',
      { timeout: RESPONSE_TIMEOUT },
    );
    await registration.getByRole('button', { name: 'Withdraw' }).click();
    await confirm(page, 'Withdraw');

    expect((await withdrawn).status()).toBe(200);
    await expect(
      registration.getByRole('button', { name: 'Register', exact: true }),
    ).toBeVisible();
    await expect(registration).not.toContainText(adminName);
  });
});
