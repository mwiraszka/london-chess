import { expect, test } from './fixtures';
import { holdRequests } from './requests';
import {
  BLITZ,
  CHAMPIONSHIP,
  CHAMPION_MEMBER_DETAILS,
  CITY_CHAMPION,
  MATCH,
  PROFILE_MEMBER,
  RAPID,
  TOURNAMENTS,
} from './seed';
import { bodyRows } from './tables';

test.describe('member profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/members/${PROFILE_MEMBER.number}`);
    await expect(
      page.getByRole('heading', {
        name: `${PROFILE_MEMBER.firstName} ${PROFILE_MEMBER.lastName}`,
      }),
    ).toBeVisible();
  });

  test("shows the member's public details", async ({ page }) => {
    const main = page.locator('main');

    await expect(main).toContainText(
      new RegExp(`chess rating\\s*${PROFILE_MEMBER.rating}`),
    );
    await expect(
      main.getByRole('definition').filter({ hasText: PROFILE_MEMBER.peakRating }),
    ).toBeVisible();
    await expect(
      main.getByRole('definition').filter({ hasText: PROFILE_MEMBER.city }),
    ).toBeVisible();
    await expect(
      main.getByRole('definition').filter({ hasText: PROFILE_MEMBER.yearOfBirth! }),
    ).toBeVisible();
    await expect(
      main.getByRole('link', { name: PROFILE_MEMBER.lichessUsername }),
    ).toHaveAttribute('href', `https://lichess.org/@/${PROFILE_MEMBER.lichessUsername}`);
    await expect(
      main.getByRole('link', { name: PROFILE_MEMBER.chessComUsername }),
    ).toHaveAttribute(
      'href',
      `https://www.chess.com/member/${PROFILE_MEMBER.chessComUsername}`,
    );
  });

  test('shows a trophy for each podium finish, newest selected', async ({ page }) => {
    const trophies = page
      .getByRole('group', { name: 'Trophies won' })
      .getByRole('button');

    await expect(trophies).toHaveCount(3);
    await expect(trophies.nth(0)).toHaveAccessibleName(
      `Silver cup trophy: 2nd of 6 in ${CHAMPIONSHIP.name}, October 2 – November 6, 2025`,
    );
    await expect(trophies.nth(1)).toHaveAccessibleName(
      `Gold chalice trophy: 1st of 8 in ${BLITZ.name}, September 18, 2025`,
    );
    await expect(trophies.nth(2)).toHaveAccessibleName(
      `Bronze cup trophy: 3rd of 6 in ${RAPID.name} (Open), July 6–27, 2023`,
    );
    await expect(trophies.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Highlights' })).toContainText(
      `2nd of 6 in ${CHAMPIONSHIP.name}`,
    );
  });

  test('shows the details of a selected trophy', async ({ page }) => {
    const highlights = page.getByRole('region', { name: 'Highlights' });
    const blitzTrophy = highlights.getByRole('button', { name: /^Gold chalice trophy/ });

    await blitzTrophy.click();

    await expect(blitzTrophy).toHaveAttribute('aria-pressed', 'true');
    await expect(highlights.getByRole('button', { pressed: true })).toHaveCount(1);
    await expect(highlights).toContainText(`1st of 8 in ${BLITZ.name}`);
    const fact = (label: string) =>
      highlights
        .getByRole('term')
        .filter({ hasText: label })
        .locator('xpath=following-sibling::dd');
    await expect(fact('Date(s)')).toHaveText('Sep 18, 2025');
    await expect(fact('Format')).toHaveText('Swiss (unrated)');
    await expect(fact('Time control')).toHaveText(BLITZ.timeControl);
    await expect(fact('Score')).toHaveText('4 / 4');

    await highlights.getByRole('link', { name: BLITZ.name }).click();

    await expect(page).toHaveURL(new RegExp(`/tournaments/${BLITZ.number}$`));
  });

  test('lists every tournament played, including a match', async ({ page }) => {
    const table = page.getByRole('table', { name: 'Tournaments played' });
    const rows = bodyRows(table);

    await expect(rows).toHaveCount(TOURNAMENTS.length);
    await expect(rows.filter({ hasText: MATCH.name })).toContainText('Match');

    await rows.filter({ hasText: MATCH.name }).getByRole('link').first().click();

    await expect(page).toHaveURL(new RegExp(`/tournaments/${MATCH.number}$`));
    await expect(page.getByRole('heading', { name: MATCH.name, level: 2 })).toBeVisible();
  });
});

test('marks the reigning city champion on their profile', async ({ page }) => {
  await page.goto(`/members/${CHAMPION_MEMBER_DETAILS.number}`);

  await expect(
    page.getByRole('heading', {
      name: `${CITY_CHAMPION.firstName} ${CITY_CHAMPION.lastName}`,
    }),
  ).toBeVisible();
  await expect(page.locator('main a.champion-link[href="/city-champion"]')).toBeVisible();
});

test.describe('member rating progression', () => {
  test('charts the rating without moving a pixel as it loads', async ({ page }) => {
    const results = await holdRequests(page, /\/v1\/tournaments\/members\//);
    await page.goto(`/members/${PROFILE_MEMBER.number}`);
    const card = page
      .locator('ea-accordion')
      .filter({ has: page.locator('lcc-rating-progression') });
    const skeleton = card.locator('.rating-progression__skeleton');
    await expect(skeleton).toBeVisible();
    await expect.poll(results.count).toBeGreaterThan(0);
    const before = await card.boundingBox();

    await results.release();

    await expect(card.locator('ea-line-chart svg')).toBeVisible();
    await expect(skeleton).toHaveCount(0);
    expect(await card.boundingBox()).toEqual(before);
  });

  test("plots the member's rating across their rated tournaments", async ({ page }) => {
    await page.goto(`/members/${PROFILE_MEMBER.number}`);

    const chart = page.getByRole('group', {
      name: /Rating at each rated tournament, oldest first/,
    });

    await expect(chart).toBeVisible();
    await expect(chart.locator('.ea-line-chart__point')).not.toHaveCount(0);
  });
});
