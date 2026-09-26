import { expect, test } from './fixtures';
import { ARCHIVE_ONLY_TOURNAMENT, CHAMPIONSHIP, PROFILE_MEMBER } from './seed';

test.describe('game page', () => {
  test('shows the game details, the board and the moves', async ({ page }) => {
    await page.goto(`/tournaments/${CHAMPIONSHIP.number}`);
    await page
      .getByRole('link', { name: /^Drew with black against/ })
      .first()
      .click();

    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 2 })).toContainText(' vs ');
    const fact = (label: string) =>
      main
        .getByRole('term')
        .filter({ hasText: label })
        .locator('xpath=following-sibling::dd[1]');
    await expect(fact('Event')).toHaveText(CHAMPIONSHIP.name);
    await expect(fact('Result')).toHaveText('½-½ (Draw)');
    await expect(main.locator('lcc-pgn-viewer')).toContainText('1. ');
    await expect(
      main.getByRole('link', { name: 'Analyze game on Lichess' }),
    ).toHaveAttribute('href', /^https:\/\/lichess\.org\/analysis\/pgn\//);

    await main
      .getByRole('link', {
        name: `${PROFILE_MEMBER.firstName} ${PROFILE_MEMBER.lastName}`,
      })
      .click();

    await expect(page).toHaveURL(new RegExp(`/members/${PROFILE_MEMBER.number}$`));
  });

  test('filters the archive by player, year and result', async ({ page }) => {
    await page.goto('/game-archives');

    await page.getByRole('combobox', { name: 'Player' }).fill(PROFILE_MEMBER.lastName);
    await page
      .getByRole('option', {
        name: `${PROFILE_MEMBER.lastName}, ${PROFILE_MEMBER.firstName}`,
      })
      .click();

    await expect(page).toHaveURL(/player=[0-9a-f]{24}/);
    const rows = page.locator('.games .ea-data-table__body .ea-data-table__row');
    await expect(rows.first()).toContainText(PROFILE_MEMBER.lastName);
    await expect(rows.filter({ hasNotText: PROFILE_MEMBER.lastName })).toHaveCount(0);

    await page.getByRole('combobox', { name: /^Year/ }).click();
    await page.getByRole('option', { name: '1998', exact: true }).click();

    await expect(page).toHaveURL(/year=1998/);
    await expect(rows.first()).toContainText(ARCHIVE_ONLY_TOURNAMENT);

    await page.getByRole('button', { name: 'Clear filters' }).click();

    await expect(page).toHaveURL(/\/game-archives$/);
  });
});
