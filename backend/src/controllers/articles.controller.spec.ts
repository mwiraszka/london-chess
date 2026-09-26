import { Types } from 'mongoose';
import request from 'supertest';

import { app } from '../app';
import { Article, ArticleModel } from '../models/article.model';
import { bearer } from '../testing/clerk.mock';
import { useTestDatabase } from '../testing/database';
import { MODIFICATION_INFO, createAdmin } from '../testing/fixtures';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));

const ADMIN = 'user_admin';

function articlePayload(overrides: Partial<Article> = {}): Article {
  return {
    id: '',
    title: 'Club news',
    body: 'Body text',
    bannerImageId: 'image-1',
    bookmarkDate: null,
    modificationInfo: MODIFICATION_INFO,
    ...overrides,
  };
}

async function createArticle(overrides: Partial<Article> = {}): Promise<string> {
  const { id, ...article } = articlePayload(overrides);
  const created = await ArticleModel.create(article);
  return created._id.toString();
}

describe('articles routes', () => {
  useTestDatabase();

  describe('GET /v1/articles', () => {
    it('should return one page of articles with the filtered and total counts', async () => {
      await createArticle({ title: 'Charlie' });
      await createArticle({ title: 'Alpha' });
      await createArticle({ title: 'Bravo' });

      const response = await request(app).get(
        '/v1/articles?page=2&pageSize=2&sortBy=title&sortOrder=asc',
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items.map((item: Article) => item.title)).toEqual([
        'Charlie',
      ]);
      expect(response.body.data.filteredCount).toBe(3);
      expect(response.body.data.totalCount).toBe(3);
    });

    it('should return every matching article when no page size is given', async () => {
      await createArticle({ title: 'Spring open' });
      await createArticle({ title: 'Winter open' });
      await createArticle({ title: 'Annual meeting' });

      const response = await request(app).get('/v1/articles?search=open');

      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items[0]).toHaveProperty('id');
      expect(response.body.data.items[0]).not.toHaveProperty('_id');
      expect(response.body.data.filteredCount).toBe(2);
      expect(response.body.data.totalCount).toBe(3);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(ArticleModel, 'countDocuments').mockRejectedValue(new Error('down'));

      const response = await request(app).get('/v1/articles');

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('down');
    });
  });

  describe('GET /v1/articles/:id', () => {
    it('should return the article', async () => {
      const id = await createArticle();

      const response = await request(app).get(`/v1/articles/${id}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ id, title: 'Club news' });
    });

    it('should respond with not found for an unknown or malformed id', async () => {
      const unknown = await request(app).get(`/v1/articles/${new Types.ObjectId()}`);
      const malformed = await request(app).get('/v1/articles/not-an-id');

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(ArticleModel, 'findById').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get(`/v1/articles/${new Types.ObjectId()}`);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /v1/articles', () => {
    it('should save the article credited to the signed-in admin', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .post('/v1/articles')
        .set('Authorization', bearer(ADMIN))
        .send(articlePayload());

      expect(response.status).toBe(201);
      const saved = await ArticleModel.findById(response.body.data).lean();
      expect(saved?.title).toBe('Club news');
      expect(saved?.modificationInfo).toMatchObject({
        createdBy: 'Ada Admin',
        createdByNumber: 100,
        lastEditedBy: 'Ada Admin',
      });
    });

    it('should reject an article with unknown properties', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .post('/v1/articles')
        .set('Authorization', bearer(ADMIN))
        .send({ ...articlePayload(), extra: true });

      expect(response.status).toBe(400);
      expect(await ArticleModel.countDocuments()).toBe(0);
    });

    it('should reject an article with malformed modification info', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .post('/v1/articles')
        .set('Authorization', bearer(ADMIN))
        .send({ ...articlePayload(), modificationInfo: { createdBy: 1 } });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/^Invalid article modification info/);
    });

    it('should respond with a server error when the article cannot be saved', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .post('/v1/articles')
        .set('Authorization', bearer(ADMIN))
        .send(articlePayload({ title: '' }));

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /v1/articles/:id', () => {
    it('should update the article and keep its original creator', async () => {
      await createAdmin(ADMIN);
      const id = await createArticle();

      const response = await request(app)
        .put(`/v1/articles/${id}`)
        .set('Authorization', bearer(ADMIN))
        .send(articlePayload({ id, title: 'Renamed' }));

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(id);
      const saved = await ArticleModel.findById(id).lean();
      expect(saved?.title).toBe('Renamed');
      expect(saved?.modificationInfo).toMatchObject({
        createdBy: 'Someone Else',
        lastEditedBy: 'Ada Admin',
      });
    });

    it('should respond with not found for an unknown article', async () => {
      await createAdmin(ADMIN);
      const id = new Types.ObjectId().toString();

      const response = await request(app)
        .put(`/v1/articles/${id}`)
        .set('Authorization', bearer(ADMIN))
        .send(articlePayload({ id }));

      expect(response.status).toBe(404);
    });

    it('should reject invalid articles and modification info', async () => {
      await createAdmin(ADMIN);
      const id = await createArticle();

      const invalidArticle = await request(app)
        .put(`/v1/articles/${id}`)
        .set('Authorization', bearer(ADMIN))
        .send({ title: 5 });
      const invalidInfo = await request(app)
        .put(`/v1/articles/${id}`)
        .set('Authorization', bearer(ADMIN))
        .send({ ...articlePayload(), modificationInfo: {} });

      expect(invalidArticle.status).toBe(400);
      expect(invalidInfo.status).toBe(400);
    });

    it('should respond with a server error for a malformed id', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .put('/v1/articles/not-an-id')
        .set('Authorization', bearer(ADMIN))
        .send(articlePayload());

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /v1/articles/:id', () => {
    it('should delete the article', async () => {
      await createAdmin(ADMIN);
      const id = await createArticle();

      const response = await request(app)
        .delete(`/v1/articles/${id}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(200);
      expect(await ArticleModel.countDocuments()).toBe(0);
    });

    it('should respond with not found for an unknown article', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .delete(`/v1/articles/${new Types.ObjectId()}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(404);
    });

    it('should respond with a server error for a malformed id', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .delete('/v1/articles/not-an-id')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(500);
    });
  });
});
