import { expect, test } from './fixtures';
import { ARTICLES } from './seed';

const [ARTICLE] = ARTICLES;

const NAV_LINKS: [name: string, path: string, heading: string][] = [
  ['FAQ', '/faq', 'FAQ'],
  ['Members', '/members', 'Members'],
  ['Schedule', '/schedule', 'Schedule'],
  ['Tournaments', '/tournaments', 'Tournaments'],
  ['Articles', '/articles', 'Articles'],
  ['City Championship', '/city-championship', 'City Championship'],
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

  test('goes back to the same spot on a page after following a link', async ({
    page,
  }) => {
    await page.goto('/faq');
    await expect(page.getByRole('heading', { name: 'FAQ', level: 2 })).toBeVisible();
    const scroller = page.locator('.scroller');
    const spot = await scroller.evaluate(element => {
      element.scrollTo({ top: 200 });
      return element.scrollTop;
    });
    expect(spot).toBeGreaterThan(0);

    await page
      .locator('lcc-navigation-bar')
      .getByRole('link', { name: 'Schedule', exact: true })
      .click();
    await expect(page).toHaveURL(/\/schedule$/);
    await expect(scroller).toHaveJSProperty('scrollTop', 0);
    await page.goBack();

    await expect(page).toHaveURL(/\/faq$/);
    await expect(scroller).toHaveJSProperty('scrollTop', spot);
  });

  test('goes back to the same spot on a page that has to load after leaving the site', async ({
    page,
  }) => {
    await page.goto(`/article/view/${ARTICLE.id}`);
    await expect(
      page.locator('main').getByRole('heading', { name: 'A tense finish', level: 2 }),
    ).toBeVisible();
    const scroller = page.locator('.scroller');
    const spot = await scroller.evaluate(element => {
      element.scrollTo({ top: element.scrollHeight });
      return element.scrollTop;
    });
    expect(spot).toBeGreaterThan(0);

    await page.goto('about:blank');
    await page.goBack();

    await expect(page).toHaveURL(new RegExp(`/article/view/${ARTICLE.id}$`));
    await expect(scroller).toHaveJSProperty('scrollTop', spot);
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
