import { Types } from 'mongoose';
import sharp from 'sharp';
import request from 'supertest';

import { app } from '../app';
import { ArticleModel } from '../models/article.model';
import { CombinedImage, Image, ImageModel } from '../models/image.model';
import { bearer } from '../testing/clerk.mock';
import { useTestDatabase } from '../testing/database';
import { MODIFICATION_INFO, createAdmin } from '../testing/fixtures';
import { getSignedUrl, send, sentKeys } from '../testing/storage.mock';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));
vi.mock('../services/storage.service', () => import('../testing/storage.mock.js'));
vi.mock('@aws-sdk/s3-request-presigner', () => import('../testing/storage.mock.js'));

const ADMIN = 'user_admin';
const NOW = new Date('2026-09-26T12:00:00.000Z');

function imagePayload(overrides: Partial<Image> = {}): Image {
  return {
    id: '',
    filename: 'board.png',
    caption: 'A board',
    album: 'Club night',
    albumCover: false,
    albumOrdinality: '1',
    modificationInfo: MODIFICATION_INFO,
    ...overrides,
  };
}

async function createImage(overrides: Partial<Image> = {}): Promise<string> {
  const { id, ...image } = imagePayload(overrides);
  const created = await ImageModel.create(image);
  return created._id.toString();
}

async function useInArticle(bannerImageId: string): Promise<void> {
  await ArticleModel.create({
    title: 'News',
    body: 'Body',
    bannerImageId,
    modificationInfo: MODIFICATION_INFO,
  });
}

function storageAnswers(httpStatusCode: number): void {
  send.mockResolvedValue({ $metadata: { httpStatusCode } });
}

describe('images routes', () => {
  useTestDatabase();

  let png: Buffer;

  beforeAll(async () => {
    png = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET /v1/images/all-metadata', () => {
    it('should return the metadata of every image', async () => {
      const id = await createImage();

      const response = await request(app).get('/v1/images/all-metadata');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([
        expect.objectContaining({ id, caption: 'A board' }),
      ]);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(ImageModel, 'find').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get('/v1/images/all-metadata');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/images/thumbnails', () => {
    it('should return a page of thumbnails with signed URLs and article counts', async () => {
      const used = await createImage({ caption: 'Alpha' });
      await createImage({ caption: 'Bravo' });
      await createImage({ caption: 'Charlie' });
      await useInArticle(used);
      await useInArticle(used);

      const response = await request(app).get(
        '/v1/images/thumbnails?page=1&pageSize=2&sortBy=caption&sortOrder=asc',
      );

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('private, max-age=21600');
      const images: CombinedImage[] = response.body.data.items;
      expect(images.map(image => image.caption)).toEqual(['Alpha', 'Bravo']);
      expect(images[0]).toMatchObject({
        id: used,
        thumbnailUrl: `https://signed.test/${used}-thumb`,
        articleAppearances: 2,
        urlExpirationDate: '2026-09-27T00:00:00.000Z',
      });
      expect(images[1].articleAppearances).toBe(0);
      expect(response.body.data).toMatchObject({ filteredCount: 3, totalCount: 3 });
      expect(response.body.message).toBeUndefined();
    });

    it('should report the thumbnails that could not be signed', async () => {
      await createImage({ caption: 'Alpha' });
      await createImage({ caption: 'Bravo' });
      getSignedUrl.mockRejectedValueOnce(new Error('R2 down'));

      const response = await request(app).get('/v1/images/thumbnails');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.message).toBe('[IM-2.2] 1 image(s) failed to load');
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(ImageModel, 'countDocuments').mockRejectedValue(new Error('down'));

      const response = await request(app).get('/v1/images/thumbnails');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/images/batch-thumbnails', () => {
    it('should return the thumbnails of the images that exist', async () => {
      const first = await createImage();
      const second = await createImage();
      await useInArticle(second);
      const missing = new Types.ObjectId().toString();

      const response = await request(app).get(
        `/v1/images/batch-thumbnails?ids=${first},${missing},${second}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.map((image: CombinedImage) => image.id)).toEqual([
        first,
        second,
      ]);
      expect(response.body.data[1].articleAppearances).toBe(1);
    });

    it('should reject a missing, oversized or malformed list of ids', async () => {
      const tooMany = Array.from({ length: 101 }, () => new Types.ObjectId()).join(',');

      const missing = await request(app).get('/v1/images/batch-thumbnails');
      const oversized = await request(app).get(
        `/v1/images/batch-thumbnails?ids=${tooMany}`,
      );
      const malformed = await request(app).get('/v1/images/batch-thumbnails?ids=abc');

      expect(missing.status).toBe(400);
      expect(oversized.status).toBe(400);
      expect(malformed.body.message).toBe('[IM-3.3] Invalid image ID(s): abc');
    });

    it('should respond with not found when none of the images can be loaded', async () => {
      const id = await createImage();
      getSignedUrl.mockRejectedValue(new Error('R2 down'));

      const response = await request(app).get(`/v1/images/batch-thumbnails?ids=${id}`);

      expect(response.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(ImageModel, 'find').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get(
        `/v1/images/batch-thumbnails?ids=${new Types.ObjectId()}`,
      );

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/images/:id', () => {
    it('should return the image with a signed main URL', async () => {
      const id = await createImage();
      await useInArticle(id);

      const response = await request(app).get(`/v1/images/${id}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id,
        mainUrl: `https://signed.test/${id}`,
        articleAppearances: 1,
      });
      expect(response.body.data).not.toHaveProperty('thumbnailUrl');
    });

    it('should reject a malformed id and report an unknown one', async () => {
      const malformed = await request(app).get('/v1/images/abc');
      const unknown = await request(app).get(`/v1/images/${new Types.ObjectId()}`);

      expect(malformed.status).toBe(400);
      expect(unknown.status).toBe(404);
    });
  });

  describe('POST /v1/images', () => {
    it('should resize, store and record each uploaded image', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .post('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .attach('files', png, { filename: 'board.png', contentType: 'image/png' })
        .field('imageMetadata', JSON.stringify(imagePayload()));

      expect(response.status).toBe(201);
      const [image]: CombinedImage[] = response.body.data;
      expect(image).toMatchObject({
        mainUrl: `https://signed.test/${image.id}`,
        thumbnailUrl: `https://signed.test/${image.id}-thumb`,
        articleAppearances: 0,
      });
      expect(sentKeys().sort()).toEqual([image.id, `${image.id}-thumb`]);
      const saved = await ImageModel.findById(image.id).lean();
      expect(saved).toMatchObject({
        mainWidth: 1800,
        mainHeight: 900,
        thumbnailWidth: 320,
        thumbnailHeight: 160,
      });
      expect(saved?.modificationInfo.createdBy).toBe('Ada Admin');
    });

    it('should reject an upload without files or with metadata for a different number of files', async () => {
      await createAdmin(ADMIN);

      const withoutFiles = await request(app)
        .post('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .field('imageMetadata', JSON.stringify(imagePayload()));
      const mismatch = await request(app)
        .post('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .attach('files', png, { filename: 'board.png', contentType: 'image/png' })
        .field('imageMetadata', JSON.stringify(imagePayload()))
        .field('imageMetadata', JSON.stringify(imagePayload()));

      expect(withoutFiles.status).toBe(400);
      expect(mismatch.body.message).toBe('[IM-5.2] Image metadata mismatch');
    });

    it('should save nothing when storage does not accept an image', async () => {
      await createAdmin(ADMIN);
      storageAnswers(500);

      const response = await request(app)
        .post('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .attach('files', png, { filename: 'board.png', contentType: 'image/png' })
        .field('imageMetadata', JSON.stringify(imagePayload()));

      expect(response.status).toBe(500);
      expect(await ImageModel.countDocuments()).toBe(0);
    });

    it('should respond with a timeout when the database runs out of time', async () => {
      await createAdmin(ADMIN);
      send.mockRejectedValue(new Error('ExceededTimeLimit'));

      const response = await request(app)
        .post('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .attach('files', png, { filename: 'board.png', contentType: 'image/png' })
        .field('imageMetadata', JSON.stringify(imagePayload()));

      expect(response.status).toBe(504);
      expect(await ImageModel.countDocuments()).toBe(0);
    });
  });

  describe('PUT /v1/images', () => {
    it('should update existing images and add new ones', async () => {
      await createAdmin(ADMIN);
      const id = await createImage();
      const unknown = new Types.ObjectId().toString();

      const response = await request(app)
        .put('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .field(
          'existingImages',
          JSON.stringify([
            imagePayload({ id, caption: 'Renamed' }),
            imagePayload({ id: unknown }),
          ]),
        )
        .attach('files', png, { filename: 'new.png', contentType: 'image/png' })
        .field('imageMetadata', JSON.stringify(imagePayload({ caption: 'New' })));

      expect(response.status).toBe(200);
      expect(response.body.data.updatedImages.map((image: Image) => image.id)).toEqual([
        id,
      ]);
      expect(response.body.data.newImages).toHaveLength(1);
      const saved = await ImageModel.findById(id).lean();
      expect(saved?.caption).toBe('Renamed');
      expect(saved?.modificationInfo.lastEditedBy).toBe('Ada Admin');
      expect(await ImageModel.countDocuments()).toBe(2);
    });

    it('should accept a single existing image without new files', async () => {
      await createAdmin(ADMIN);
      const id = await createImage();

      const response = await request(app)
        .put('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .field('existingImages', JSON.stringify(imagePayload({ id, album: 'Other' })));

      expect(response.status).toBe(200);
      expect(response.body.data.newImages).toEqual([]);
      expect((await ImageModel.findById(id).lean())?.album).toBe('Other');
    });

    it('should reject malformed existing images and mismatched metadata', async () => {
      await createAdmin(ADMIN);
      const id = await createImage();

      const malformed = await request(app)
        .put('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .field('existingImages', '{');
      const mismatch = await request(app)
        .put('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .field(
          'existingImages',
          JSON.stringify([imagePayload({ id, caption: 'Renamed' })]),
        )
        .attach('files', png, { filename: 'new.png', contentType: 'image/png' })
        .field('imageMetadata', JSON.stringify(imagePayload()))
        .field('imageMetadata', JSON.stringify(imagePayload()));

      expect(malformed.status).toBe(400);
      expect(mismatch.status).toBe(400);
      expect(mismatch.body.message).toBe('[IM-6.1] Image metadata mismatch');
      expect((await ImageModel.findById(id).lean())?.caption).toBe('A board');
    });

    it('should respond with a timeout when the database runs out of time', async () => {
      await createAdmin(ADMIN);
      send.mockRejectedValue(new Error('ExceededTimeLimit'));

      const response = await request(app)
        .put('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .attach('files', png, { filename: 'new.png', contentType: 'image/png' })
        .field('imageMetadata', JSON.stringify(imagePayload()));

      expect(response.status).toBe(504);
    });

    it('should respond with a server error for a malformed image id', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .put('/v1/images')
        .set('Authorization', bearer(ADMIN))
        .field('existingImages', JSON.stringify(imagePayload({ id: 'abc' })));

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /v1/images/:id', () => {
    it('should delete both stored sizes and the record', async () => {
      await createAdmin(ADMIN);
      const id = await createImage();
      storageAnswers(204);

      const response = await request(app)
        .delete(`/v1/images/${id}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(200);
      expect(sentKeys()).toEqual([id, `${id}-thumb`]);
      expect(await ImageModel.countDocuments()).toBe(0);
    });

    it('should respond with not found when the record is already gone', async () => {
      await createAdmin(ADMIN);
      storageAnswers(204);

      const response = await request(app)
        .delete(`/v1/images/${new Types.ObjectId()}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(404);
    });

    it('should keep the record when storage does not confirm the deletion', async () => {
      await createAdmin(ADMIN);
      const id = await createImage();

      const response = await request(app)
        .delete(`/v1/images/${id}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(500);
      expect(await ImageModel.countDocuments()).toBe(1);
    });

    it('should respond with a server error when storage fails', async () => {
      await createAdmin(ADMIN);
      send.mockRejectedValue(new Error('R2 down'));

      const response = await request(app)
        .delete(`/v1/images/${new Types.ObjectId()}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /v1/images/album/:album', () => {
    it('should delete every image in the album', async () => {
      await createAdmin(ADMIN);
      const first = await createImage();
      const second = await createImage();
      const other = await createImage({ album: 'Other' });

      const response = await request(app)
        .delete('/v1/images/album/Club night')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(200);
      expect(response.body.data.sort()).toEqual([first, second].sort());
      expect(response.body.message).toBe(
        'Successfully deleted all 2 images from Club night',
      );
      expect((await ImageModel.find().lean()).map(image => image._id.toString())).toEqual(
        [other],
      );
    });

    it('should report the images that could not be deleted', async () => {
      await createAdmin(ADMIN);
      const first = await createImage();
      await createImage();
      send.mockImplementation(async command => {
        if (command.input.Key === first) {
          throw new Error('R2 down');
        }
        return { $metadata: { httpStatusCode: 204 } };
      });

      const response = await request(app)
        .delete('/v1/images/album/Club night')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.message).toMatch(/^\[IM-8\.7\] Deleted 1 out of 2 images/);
      expect(await ImageModel.exists({ _id: first })).not.toBeNull();
    });

    it('should respond with a server error when no image could be deleted', async () => {
      await createAdmin(ADMIN);
      await createImage();
      vi.spyOn(ImageModel, 'deleteOne').mockResolvedValue({
        acknowledged: true,
        deletedCount: 0,
      });

      const response = await request(app)
        .delete('/v1/images/album/Club night')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(500);
      expect(response.body.message).toBe(
        '[IM-8.6] Failed to delete any images from Club night',
      );
    });

    it('should keep an album whose images appear in articles', async () => {
      await createAdmin(ADMIN);
      const id = await createImage();
      await useInArticle(id);

      const response = await request(app)
        .delete('/v1/images/album/Club night')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(400);
      expect(send).not.toHaveBeenCalled();
    });

    it('should respond with not found for an empty album', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .delete('/v1/images/album/Nothing')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      await createAdmin(ADMIN);
      vi.spyOn(ImageModel, 'find').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app)
        .delete('/v1/images/album/Club night')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(500);
    });
  });
});
