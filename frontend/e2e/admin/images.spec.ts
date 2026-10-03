import { Page, expect, test } from '../fixtures';
import { ALBUMS, PICNIC_IMAGES } from '../seed';
import { fieldLabel, watchWrites } from './fields';
import { png } from './files';
import {
  APP_API,
  RESPONSE_TIMEOUT,
  clickDelete,
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
  await clickDelete(controls);
  await expect(page.locator('lcc-basic-dialog')).toContainText(`Delete ${album} and its`);
  await confirm(page, 'Delete');
  await expect(albumCover(page, album)).toHaveCount(0);
}

function imagesSaved(page: Page) {
  return page.waitForResponse(
    response =>
      response.url() === `${APP_API}/images` && response.request().method() === 'POST',
    { timeout: RESPONSE_TIMEOUT },
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
    await page
      .locator('lcc-image-form ea-file-uploader input[type="file"]')
      .setInputFiles(png('blitz-night.png'));
    await expect(page.getByAltText('Image preview')).toHaveAttribute(
      'src',
      /^data:image/,
    );
    await page.getByLabel(fieldLabel('Caption')).fill('Clocks ticking');
    await page.getByRole('textbox', { name: 'New album name' }).fill(album);
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
    await page.getByLabel(fieldLabel('Album title')).fill(album);
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
    // An album opens in its editor in a new tab
    const [editor] = await Promise.all([
      page.waitForEvent('popup'),
      controls.getByRole('link', { name: /^Edit / }).click(),
    ]);
    await expect(editor).toHaveURL(
      new RegExp(`/album/edit/${encodeURIComponent(ALBUMS.picnic)}$`),
    );
    const album = editor.getByLabel(fieldLabel('Album title'));
    const captions = editor.locator('input[id^="existing-caption-input-"]');
    await expect(album).toHaveValue(ALBUMS.picnic);
    await expect(captions).toHaveCount(PICNIC_IMAGES.length);

    await album.fill(`${ALBUMS.picnic} renamed`);
    await captions.first().fill('A caption that was never saved');
    // The form reports edits a moment after typing stops, which enables Revert
    await expect(
      editor.getByRole('button', { name: 'Revert', exact: true }),
    ).toBeEnabled();
    await editor
      .locator('lcc-navigation-bar')
      .getByRole('link', { name: 'News', exact: true })
      .click();
    await confirm(editor, 'Leave');
    await expect(editor).toHaveURL(/\/news$/);
    await editor.goBack();

    await expect(album).toHaveValue(ALBUMS.picnic);
    await expect(captions).toHaveCount(PICNIC_IMAGES.length);
    for (const caption of await captions.all()) {
      await expect(caption).not.toHaveValue('A caption that was never saved');
    }
  });

  test('holds back an image until it has a file', async ({ page }) => {
    await logIn(page);
    const writes = watchWrites(page, `${APP_API}/images`);
    const addImage = page.getByRole('button', { name: 'Add image' });

    await page.goto('/image/add');
    await page.getByLabel(fieldLabel('Caption')).fill('Clocks ticking');
    await page
      .getByRole('textbox', { name: 'New album name' })
      .fill(uniqueName('Blitz night'));
    await expect(addImage).toBeDisabled();

    await page
      .locator('lcc-image-form ea-file-uploader input[type="file"]')
      .setInputFiles(png('blitz-night.png'));
    await expect(addImage).toBeEnabled();

    expect(writes).toEqual([]);
    await page.getByRole('button', { name: 'Revert', exact: true }).click();
    await confirm(page, 'Revert');
  });

  test('offers to create an album only once it has an image', async ({ page }) => {
    await logIn(page);

    await page.goto('/album/add');
    await page.getByLabel(fieldLabel('Album title')).fill(uniqueName('Simul evening'));
    await expect(page.getByRole('button', { name: 'Create album' })).toBeDisabled();

    await page
      .locator('lcc-album-form input[type="file"]')
      .setInputFiles(png('first-board.png'));
    await expect(page.getByAltText('New image preview')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Create album' })).toBeEnabled();

    await page.getByRole('button', { name: 'Revert', exact: true }).click();
    await confirm(page, 'Revert');
    await expect(page.getByAltText('New image preview')).toHaveCount(0);
  });
});
