import { expect, test } from './fixtures';
import { CITY_CHAMPION } from './seed';
import { bodyRows } from './tables';

test.describe('city championship', () => {
  test('names the reigning champion at the top of the past champions', async ({
    page,
  }) => {
    await page.goto('/city-championship');

    const rows = bodyRows(page.getByRole('table', { name: 'Past champions' }));
    await expect(rows.first()).toContainText(
      `${CITY_CHAMPION.firstName} ${CITY_CHAMPION.lastName}`,
    );
    await expect(rows).toHaveCount(10);
  });

  test('shows every past year once asked to', async ({ page }) => {
    await page.goto('/city-championship');
    const table = page.getByRole('table', { name: 'Past champions' });
    const showAll = page.getByRole('button', { name: /^Show all \d+ years$/ }).first();
    const total = Number((await showAll.textContent())?.match(/\d+/)?.[0]);

    await showAll.click();

    await expect(bodyRows(table)).toHaveCount(total);
  });

  test('pages through the championship photos', async ({ page }) => {
    await page.goto('/city-championship');
    const carousel = page.getByRole('region', { name: 'Photo carousel' });
    const thirdDot = page.getByRole('button', { name: 'View photo 3' });

    await thirdDot.click();

    await expect(thirdDot).toHaveClass(/active/);
    await expect(
      carousel.getByRole('button', {
        name: 'View next photo, currently showing Championship Cup',
      }),
    ).toHaveClass(/active/);
  });
});
