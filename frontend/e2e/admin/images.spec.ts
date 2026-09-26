import { Page, expect, test } from '../fixtures';
import { ALBUMS, PICNIC_IMAGES } from '../seed';
import { png } from './files';
import {
  API,
  confirm,
  logIn,
  openAdminControls,
  requireAdminCredentials,
  uniqueName,
} from './session';

function albumCover(page: Page, album: string) {
  return page.getByRole('button', { name: new RegExp(`^${album} \\d+ PHOTOS?$`) });
}

async function deleteAlbum(page: Page, album: string): Promise<void> {
  await page.goto('/photo-gallery');
  const controls = await openAdminControls(albumCover(page, album));
  await controls.getByRole('button', { name: /^Delete / }).click();
  await expect(page.locator('lcc-dialog')).toContainText(`Delete ${album} and its`);
  await confirm(page, 'Delete');
  await expect(albumCover(page, album)).toHaveCount(0);
}

function imagesSaved(page: Page) {
  return page.waitForResponse(
    response =>
      response.url() === `${API}/images` && response.request().method() === 'POST',
  );
}

test.describe('managing images', () => {
  test.beforeEach(requireAdminCredentials);

  test('uploads an image into a new album', async ({ page }) => {
    const album = uniqueName('Blitz night');
    await logIn(page);

    await page.goto('/photo-gallery');
    await page.getByRole('link', { name: 'Add an image' }).click();
    await expect(page).toHaveURL(/\/image\/add$/);
    await page.locator('#file-input').setInputFiles(png('blitz-night.png'));
    await expect(page.getByAltText('Image preview')).toHaveAttribute(
      'src',
      /^data:image/,
    );
    await page.getByLabel('Caption:').fill('Clocks ticking');
    await page.getByPlaceholder('New album').fill(album);
    const saved = imagesSaved(page);
    await page.getByRole('button', { name: 'Add image' }).click();
    await confirm(page, 'Add');

    expect((await saved).status()).toBe(201);
    await page.goto('/photo-gallery');
    await expect(albumCover(page, album)).toHaveAccessibleName(`${album} 1 PHOTO`);

    await deleteAlbum(page, album);
  });

  test('creates an album from several images', async ({ page }) => {
    const album = uniqueName('Simul evening');
    await logIn(page);

    await page.goto('/photo-gallery');
    await page.getByRole('link', { name: 'Create an album' }).click();
    await expect(page).toHaveURL(/\/album\/add$/);
    await page.locator('#album-input').fill(album);
    await page
      .locator('lcc-album-form input[type="file"]')
      .setInputFiles([png('first-board.png'), png('second-board.png')]);
    await expect(page.getByAltText('New image preview')).toHaveCount(2);
    const saved = imagesSaved(page);
    await page.getByRole('button', { name: 'Create album' }).click();
    await confirm(page, 'Create');

    expect((await saved).status()).toBe(201);
    await page.goto('/photo-gallery');
    await expect(albumCover(page, album)).toHaveAccessibleName(`${album} 2 PHOTOS`);

    await albumCover(page, album).click();
    await expect(page.locator('lcc-image-viewer').getByRole('figure')).toContainText(
      'first-board',
    );

    await page.keyboard.press('Escape');
    await deleteAlbum(page, album);
  });

  test('leaves no edits behind in an album editor whose name has a space', async ({
    page,
  }) => {
    await logIn(page);
    await page.goto('/photo-gallery');
    const controls = await openAdminControls(albumCover(page, ALBUMS.picnic));
    await controls.getByRole('link', { name: /^Edit / }).click();
    await expect(page).toHaveURL(
      new RegExp(`/album/edit/${encodeURIComponent(ALBUMS.picnic)}$`),
    );
    const album = page.locator('#album-input');
    const captions = page.locator('lcc-album-form input[id^="existing-caption-input-"]');
    await expect(album).toHaveValue(ALBUMS.picnic);
    await expect(captions).toHaveCount(PICNIC_IMAGES.length);

    await album.fill(`${ALBUMS.picnic} renamed`);
    await captions.first().fill('A caption that was never saved');
    await page
      .locator('lcc-navigation-bar')
      .getByRole('link', { name: 'News', exact: true })
      .click();
    await confirm(page, 'Leave');
    await expect(page).toHaveURL(/\/news$/);
    await page.goBack();

    await expect(album).toHaveValue(ALBUMS.picnic);
    await expect(captions).toHaveCount(PICNIC_IMAGES.length);
    for (const caption of await captions.all()) {
      await expect(caption).not.toHaveValue('A caption that was never saved');
    }
  });
});
