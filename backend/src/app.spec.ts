import request from 'supertest';

import pkg from '../package.json';
import { app } from './app';
import { connectToDatabase } from './services/mongo-db.service';
import { useTestDatabase } from './testing/database';

vi.mock('@clerk/backend', () => import('./testing/clerk.mock.js'));
vi.mock('./services/clerk.service', () => import('./testing/clerk.mock.js'));
vi.mock('./services/mongo-db.service', async importOriginal => {
  const actual = await importOriginal<typeof import('./services/mongo-db.service')>();
  return { connectToDatabase: vi.fn(actual.connectToDatabase) };
});

describe('app', () => {
  useTestDatabase();

  it('should answer the test route', async () => {
    const response = await request(app).get('/v1/test');

    expect(response.status).toBe(200);
    expect(response.body.data).toContain('LCC API v1');
  });

  it('should report the running version', async () => {
    const response = await request(app).get('/v1/version');

    expect(response.body.data).toBe(pkg.version);
  });

  it('should allow requests only from the club sites and previews', async () => {
    const site = await request(app)
      .get('/v1/test')
      .set('Origin', 'https://londonchess.ca');
    const preview = await request(app)
      .get('/v1/test')
      .set('Origin', 'https://lcc-git-branch.vercel.app');
    const other = await request(app).get('/v1/test').set('Origin', 'https://example.com');

    expect(site.headers['access-control-allow-origin']).toBe('https://londonchess.ca');
    expect(preview.headers['access-control-allow-origin']).toBe(
      'https://lcc-git-branch.vercel.app',
    );
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should respond with a server error when the database cannot be reached', async () => {
    vi.mocked(connectToDatabase).mockRejectedValueOnce(new Error('refused'));

    const response = await request(app).get('/v1/test');

    expect(response.status).toBe(500);
  });
});
