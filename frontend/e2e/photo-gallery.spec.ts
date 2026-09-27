import { expect, test } from './fixtures';
import { ALBUMS, CHAMPIONSHIP_IMAGES, IMAGES } from './seed';

test.describe('photo gallery', () => {
  test('shows every album with its cover and photo count', async ({ page }) => {
    await page.goto('/photo-gallery');

    for (const album of Object.values(ALBUMS)) {
      const count = IMAGES.filter(image => image.album === album).length;
      const cover = page.getByRole('button', {
        name: `${album} ${count} ${count === 1 ? 'PHOTO' : 'PHOTOS'}`,
      });
      await expect(cover).toBeVisible();
      await expect(cover.getByRole('img')).toHaveJSProperty('complete', true);
    }
  });

  test('pages through an album in the viewer', async ({ page }) => {
    await page.goto('/photo-gallery');

    await page
      .getByRole('button', { name: new RegExp(`^${ALBUMS.championship}`) })
      .click();

    const viewer = page.locator('lcc-image-viewer').getByRole('figure');
    await expect(viewer).toContainText(CHAMPIONSHIP_IMAGES[0].caption);

    await page.keyboard.press('ArrowRight');

    await expect(viewer).toContainText(CHAMPIONSHIP_IMAGES[1].caption);

    await page
      .locator('lcc-image-viewer')
      .getByRole('button', { name: 'Previous image' })
      .click();

    await expect(viewer).toContainText(CHAMPIONSHIP_IMAGES[0].caption);

    await page.keyboard.press('Escape');

    await expect(viewer).toHaveCount(0);
  });
});
