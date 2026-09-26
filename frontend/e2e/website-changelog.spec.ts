import { expect, test } from './fixtures';

test.describe('website changelog', () => {
  test('expands a release to show its changes', async ({ page }) => {
    await page.goto('/website-changelog');
    const jumpLinks = page
      .getByRole('navigation', { name: 'Jump to a release' })
      .getByRole('button');
    const secondVersion = (await jumpLinks.nth(1).textContent())!.trim();
    const toggle = page.locator(
      `button.release-toggle[aria-controls="${secondVersion}-details"]`,
    );

    await jumpLinks.nth(1).click();

    await expect(page).toHaveURL(new RegExp(`#${secondVersion.replace(/\./g, '\\.')}$`));
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(`[id="${secondVersion}-details"]`)).toBeVisible();

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('marks the running version as current', async ({ page }) => {
    await page.goto('/website-changelog');

    await expect(
      page.getByRole('heading', { name: /^Version [\d.]+ Current/ }),
    ).toBeVisible();
  });
});
