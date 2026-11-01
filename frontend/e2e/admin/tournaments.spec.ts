import { Page, expect, test } from '../fixtures';
import { ADMIN, PROFILE_MEMBER, RIVAL_MEMBER, UPCOMING } from '../seed';
import { bodyRows } from '../tables';
import { fieldError, fieldLabel, fillField, nextMonthOn } from './fields';
import {
  API,
  APP_API,
  RESPONSE_TIMEOUT,
  chooseAdminAction,
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

const PROFILE = `${PROFILE_MEMBER.lastName}, ${PROFILE_MEMBER.firstName}`;
const RIVAL = `${RIVAL_MEMBER.lastName}, ${RIVAL_MEMBER.firstName}`;

// Round 1 of the standings above, as a scoresheet transcribes it
function roundOnePgn(result: '1-0' | '0-1'): string {
  return [
    '[Event "Autumn Rapid"]',
    '[Round "1"]',
    `[White "${PROFILE}"]`,
    `[Black "${RIVAL}"]`,
    `[Result "${result}"]`,
    '[WhiteElo "1850"]',
    '[BlackElo "1790"]',
    '',
    `1. e4 e5 2. Nf3 Nc6 ${result}`,
  ].join('\n');
}

async function importFile(
  page: Page,
  name: string,
  mimeType: string,
  content: string,
): Promise<void> {
  await page
    .locator('lcc-tournament-form ea-file-uploader input[type="file"]')
    .setInputFiles({ name, mimeType, buffer: Buffer.from(content) });
}

async function importStandings(page: Page, content: string): Promise<void> {
  await importFile(page, 'Standings.csv', 'text/csv', content);
}

async function importPgn(page: Page, content: string): Promise<void> {
  await importFile(page, 'Round 1.pgn', 'application/x-chess-pgn', content);
}

// One round between the two members, sent straight to the API so the test starts on a
// tournament with recorded results; its time control is one no seeded tournament has
function roundOneTournament(name: string) {
  const entry = (
    rank: number,
    entrant: string,
    rating: number,
    points: number,
    color: 'white' | 'black',
  ) => ({
    rank,
    name: entrant,
    playerId: null,
    rating,
    provisionalGames: null,
    score: points,
    tiebreak: null,
    rounds: [
      {
        round: 1,
        outcome: 'game',
        scores: [points],
        points,
        opponentRank: 3 - rank,
        color,
      },
    ],
  });
  return {
    name,
    subtitle: '',
    date: nextMonthOn(10),
    endDate: null,
    format: 'swiss',
    timeControl: 'G45',
    roundCount: null,
    isRated: true,
    articleId: null,
    registrationOpens: null,
    registrationCloses: null,
    sections: [
      {
        name: '',
        ratingBand: '',
        roundCount: 1,
        isDoubleRound: false,
        entries: [entry(1, PROFILE, 1850, 1, 'white'), entry(2, RIVAL, 1790, 0, 'black')],
      },
    ],
    games: null,
    modificationInfo: {},
  };
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
    await chooseAdminAction(page, 'Add tournament');
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

    await chooseAdminAction(page, 'Edit tournament');
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
    await chooseAdminAction(page, 'Delete tournament');
    await confirm(page, 'Delete');

    expect((await deleted).status()).toBe(200);
    await expect(page).toHaveURL(/\/tournaments$/);
    await expect(page.getByRole('table', { name: 'Tournaments' })).not.toContainText(
      name,
    );
  });

  test('checks a PGN against the recorded results before adding its games', async ({
    page,
    request,
  }) => {
    const authorization = await logIn(page);
    const created = await request.post(`${API}/tournaments`, {
      headers: { authorization },
      data: roundOneTournament(uniqueName('Autumn Rapid')),
    });
    expect(created.status()).toBe(201);
    const { data: number } = await created.json();

    await page.goto(`/tournament/edit/${number}`);
    await importPgn(page, roundOnePgn('0-1'));

    const problems = page.locator('.results__problems');
    await expect(problems).toContainText('These games could not be added:');
    await expect(problems).toContainText(
      `the standings give ${PROFILE} 1 in round 1, but the game gives 0.`,
    );

    // A corrected file chosen under the same name takes the rejected one's place
    await importPgn(page, roundOnePgn('1-0'));
    await expect(page.locator('lcc-basic-dialog')).toContainText(
      'Replace Round 1.pgn with the file just chosen?',
    );
    await confirm(page, 'Replace');

    await expect(problems).toHaveCount(0);
    await expect(
      page.getByText('1 new game will be added to the game archive.'),
    ).toBeVisible();
    const updated = waitForSave(page, 'PUT');
    await page.getByRole('button', { name: 'Update tournament' }).click();
    await expect(page.locator('lcc-basic-dialog')).toContainText(
      'The games from the PGN will be added to the game archive.',
    );
    await confirm(page, 'Update');

    expect((await updated).status()).toBe(200);
    const standings = page.getByRole('table', { name: 'Standings' });
    await expect(bodyRows(standings).first()).toContainText(PROFILE);
    await expect(
      standings.getByRole('link', { name: /^Won with white against/ }),
    ).toHaveAttribute('href', /\/game-archives\/[0-9a-f]{24}$/);

    const deleted = await request.delete(`${API}/tournaments/${number}`, {
      headers: { authorization },
    });
    expect(deleted.status()).toBe(200);
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
