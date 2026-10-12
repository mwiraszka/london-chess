import express, { RequestHandler } from 'express';
import request from 'supertest';

import { clearCacheAfterWrite, limitCdnCache, publicCache } from './cdn-cache.middleware';

const { dangerouslyDeleteByTag } = vi.hoisted(() => ({
  dangerouslyDeleteByTag: vi.fn<(tag: string) => Promise<void>>(async () => undefined),
}));

vi.mock('@vercel/functions', () => ({ dangerouslyDeleteByTag }));

const answer =
  (status: number): RequestHandler =>
  (_req, res) => {
    res.status(status).json({ data: 'answer' });
  };

describe('publicCache', () => {
  const app = express().use(publicCache).get('/', answer(200)).post('/', answer(201));

  it('should keep a production read on the CDN for a day under the public data tag', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');

    const response = await request(app).get('/');

    expect(response.headers['vercel-cdn-cache-control']).toBe('s-maxage=86400');
    expect(response.headers['vercel-cache-tag']).toBe('public-data');
  });

  it('should leave a production write off the CDN', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');

    const response = await request(app).post('/');

    expect(response.headers['vercel-cdn-cache-control']).toBeUndefined();
  });

  it('should leave every answer off the CDN outside production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');

    const response = await request(app).get('/');

    expect(response.headers['vercel-cdn-cache-control']).toBeUndefined();
    expect(response.headers['vercel-cache-tag']).toBeUndefined();
  });
});

describe('limitCdnCache', () => {
  const appLimitedTo = (seconds: number) =>
    express()
      .use(publicCache)
      .get('/', (_req, res) => {
        limitCdnCache(res, seconds);
        res.status(200).json({ data: 'answer' });
      });

  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'production');
  });

  it('should shorten the stay of an answer that goes out of date sooner', async () => {
    const response = await request(appLimitedTo(3600)).get('/');

    expect(response.headers['vercel-cdn-cache-control']).toBe('s-maxage=3600');
  });

  it('should never keep an answer longer than a day', async () => {
    const response = await request(appLimitedTo(3 * 24 * 3600)).get('/');

    expect(response.headers['vercel-cdn-cache-control']).toBe('s-maxage=86400');
  });

  it('should keep an answer for at least a whole second', async () => {
    const response = await request(appLimitedTo(0.2)).get('/');

    expect(response.headers['vercel-cdn-cache-control']).toBe('s-maxage=1');
  });
});

describe('clearCacheAfterWrite', () => {
  const app = express()
    .use(clearCacheAfterWrite)
    .get('/', answer(200))
    .post('/', answer(201))
    .post('/rejected', answer(400));

  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'production');
  });

  it('should clear the public data from the CDN before answering a successful write', async () => {
    const response = await request(app).post('/');

    expect(dangerouslyDeleteByTag).toHaveBeenCalledExactlyOnceWith('public-data');
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: 'answer' });
  });

  it('should leave the CDN alone for a write that fails', async () => {
    const response = await request(app).post('/rejected');

    expect(response.status).toBe(400);
    expect(dangerouslyDeleteByTag).not.toHaveBeenCalled();
  });

  it('should leave the CDN alone for a read', async () => {
    await request(app).get('/');

    expect(dangerouslyDeleteByTag).not.toHaveBeenCalled();
  });

  it('should leave the CDN alone outside production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');

    await request(app).post('/');

    expect(dangerouslyDeleteByTag).not.toHaveBeenCalled();
  });

  it('should still answer a write when the CDN cannot be cleared', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dangerouslyDeleteByTag.mockRejectedValueOnce(new Error('unreachable'));

    const response = await request(app).post('/');

    expect(response.status).toBe(201);
    expect(error).toHaveBeenCalledWith(
      '[LCC] Unable to clear the CDN cache: Error: unreachable',
    );
  });
});
