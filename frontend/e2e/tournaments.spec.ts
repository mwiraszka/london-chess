import { Page, expect, test } from './fixtures';
import {
  BLITZ,
  CHAMPIONSHIP,
  MATCH,
  PROFILE_MEMBER,
  RAPID,
  TOURNAMENTS,
  UPCOMING,
} from './seed';
import { bodyRows } from './tables';

function tournamentRows(page: Page) {
  return bodyRows(page.getByRole('table', { name: 'Tournaments' }));
}

async function filterBy(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: new RegExp(`^${label}`) }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('tournaments', () => {
  test('lists every tournament, newest first, badging those still to come', async ({
    page,
  }) => {
    await page.goto('/tournaments');

    const rows = tournamentRows(page);
    await expect(rows).toHaveCount(TOURNAMENTS.length + 1);
    await expect(rows.first()).toContainText(UPCOMING.name);
    await expect(rows.first()).toContainText('Upcoming');
    await expect(rows.nth(1)).toContainText(CHAMPIONSHIP.name);
    await expect(rows.last()).toContainText(MATCH.name);
    await expect(rows.filter({ hasText: CHAMPIONSHIP.name })).toContainText(
      'Round robin',
    );
    await expect(rows.filter({ hasText: RAPID.name })).toContainText('12');
  });

  test('filters by year, time control and format', async ({ page }) => {
    await page.goto('/tournaments');

    await filterBy(page, 'Year', '2025');

    await expect(tournamentRows(page)).toHaveCount(2);

    await filterBy(page, 'Format', 'Swiss');

    await expect(tournamentRows(page)).toHaveCount(1);
    await expect(tournamentRows(page)).toContainText(BLITZ.name);

    await page.getByRole('button', { name: 'Clear filters' }).click();

    await expect(tournamentRows(page)).toHaveCount(TOURNAMENTS.length + 1);

    await filterBy(page, 'Time control', RAPID.timeControl);

    await expect(tournamentRows(page)).toHaveCount(2);
    await expect(tournamentRows(page).filter({ hasText: RAPID.name })).toHaveCount(1);
    await expect(tournamentRows(page).filter({ hasText: UPCOMING.name })).toHaveCount(1);
  });

  test('shows the crosstable of a tournament, linked to its games', async ({ page }) => {
    await page.goto('/tournaments');
    await tournamentRows(page)
      .filter({ hasText: CHAMPIONSHIP.name })
      .getByRole('link')
      .first()
      .click();

    await expect(page).toHaveURL(new RegExp(`/tournaments/${CHAMPIONSHIP.number}$`));
    await expect(
      page.getByRole('heading', { name: CHAMPIONSHIP.name, level: 2 }),
    ).toBeVisible();
    await expect(page.locator('main')).toContainText(
      /Round robin\s*\(rated\)\s*G90\+30\s*6 players/,
    );
    const standings = page.getByRole('table', { name: 'Standings' });
    await expect(bodyRows(standings)).toHaveCount(6);
    const runnerUp = bodyRows(standings).nth(1);
    await expect(runnerUp).toContainText(
      `${PROFILE_MEMBER.lastName}, ${PROFILE_MEMBER.firstName}`,
    );
    await expect(runnerUp).toContainText('3½');

    await runnerUp.getByRole('link', { name: /^Drew with black against/ }).click();

    await expect(page).toHaveURL(/\/game-archives\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { level: 2 })).toContainText(
      PROFILE_MEMBER.lastName,
    );
  });

  test('shows each section of a tournament with its games', async ({ page }) => {
    await page.goto(`/tournaments/${RAPID.number}`);

    for (const section of RAPID.sections) {
      await expect(
        page.getByRole('heading', { name: section.ratingBand, level: 3 }),
      ).toBeVisible();
      await expect(
        bodyRows(page.getByRole('table', { name: `Standings, ${section.ratingBand}` })),
      ).toHaveCount(section.playerKeys.length);
      await expect(
        bodyRows(page.getByRole('table', { name: `Games, ${section.ratingBand}` })),
      ).toHaveCount(9);
    }
  });

  test("links a player's name to their profile", async ({ page }) => {
    await page.goto(`/tournaments/${CHAMPIONSHIP.number}`);

    await page
      .getByRole('link', {
        name: `${PROFILE_MEMBER.lastName}, ${PROFILE_MEMBER.firstName}`,
      })
      .click();

    await expect(page).toHaveURL(new RegExp(`/members/${PROFILE_MEMBER.number}$`));
  });

  test('shows an upcoming tournament above the table, with who has registered', async ({
    page,
  }) => {
    await page.goto('/tournaments');

    const upcoming = page.locator('.upcoming__item').filter({ hasText: UPCOMING.name });
    await expect(upcoming).toContainText('Registration open until');
    await expect(upcoming).toContainText('1 player registered');

    await upcoming.getByRole('link', { name: UPCOMING.name }).click();

    await expect(page).toHaveURL(new RegExp(`/tournaments/${UPCOMING.number}$`));
    const registration = page.locator('.registration');
    await expect(
      registration.getByRole('list', { name: 'Registered players' }),
    ).toContainText(`${PROFILE_MEMBER.firstName} ${PROFILE_MEMBER.lastName}`);
    await expect(
      registration.getByRole('button', { name: 'Log in to register' }),
    ).toBeVisible();
    await expect(page.getByText('Standings will appear here')).toBeVisible();
  });
});
