import { expect, test } from './fixtures';

const NAV_LINKS: [name: string, path: string, heading: string][] = [
  ['FAQ', '/faq', 'FAQ'],
  ['Members', '/members', 'Members'],
  ['Schedule', '/schedule', 'Schedule'],
  ['Articles', '/articles', 'Articles'],
  ['City Champion', '/city-champion', 'City Champion'],
  ['Photo Gallery', '/photo-gallery', 'Photo Gallery'],
  ['Game Archives', '/game-archives', 'Game Archives'],
];

test.describe('navigation', () => {
  test('reaches every page in the navigation bar', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('lcc-navigation-bar');

    for (const [name, path, heading] of NAV_LINKS) {
      await nav.getByRole('link', { name, exact: true }).click();

      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible();
    }

    await nav.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('reaches the archive pages from the footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('lcc-footer');

    await footer.getByRole('link', { name: 'Tournaments' }).click();
    await expect(
      page.getByRole('heading', { name: 'Tournaments', level: 2 }),
    ).toBeVisible();

    await footer.getByRole('link', { name: 'Regional Clubs' }).click();
    await expect(
      page.getByRole('heading', { name: 'Regional Clubs', level: 2 }),
    ).toBeVisible();

    await footer.getByRole('link', { name: 'Lifetime Achievement Awards' }).click();
    await expect(
      page.getByRole('heading', { name: 'Lifetime Achievement Awards', level: 2 }),
    ).toBeVisible();

    await footer.getByRole('link', { name: 'Website Changelog' }).click();
    await expect(
      page.getByRole('heading', { name: 'Website Changelog', level: 2 }),
    ).toBeVisible();
  });

  test('offers logging in from the menu', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByLabel('Log in', { exact: true }).click();

    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeDisabled();
  });

  for (const path of [
    '/no-such-page',
    '/article/view/000000000000000000000000',
    '/game-archives/000000000000000000000000',
    '/tournaments/999',
    '/members/999',
  ]) {
    test(`sends a visitor from ${path} home`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole('heading', { name: 'Welcome to the home of London chess!' }),
      ).toBeVisible();
    });
  }

  for (const path of [
    '/album/add',
    '/album/edit/Album',
    '/article/add',
    '/article/edit/000000000000000000000000',
    '/event/add',
    '/event/edit/000000000000000000000000',
    '/image/add',
    '/image/edit/000000000000000000000000',
    '/member/add',
    '/member/edit/000000000000000000000000',
    '/tournament/add',
    '/tournament/edit/105',
    '/account',
    '/account/security',
  ]) {
    test(`sends a visitor who is not logged in from ${path} home to log in`, async ({
      page,
    }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    });
  }
});
