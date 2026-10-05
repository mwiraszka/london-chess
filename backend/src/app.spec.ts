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

  it('should report the running version', async () => {
    const response = await request(app).get('/v1/version');

    expect(response.body.data).toBe(pkg.version);
  });

  it('should allow requests only from the club sites', async () => {
    const site = await request(app)
      .get('/v1/version')
      .set('Origin', 'https://londonchess.ca');
    const preview = await request(app)
      .get('/v1/version')
      .set('Origin', 'https://preview.londonchess.ca');
    const deployment = await request(app)
      .get('/v1/version')
      .set('Origin', 'https://lcc-git-branch.vercel.app');
    const other = await request(app)
      .get('/v1/version')
      .set('Origin', 'https://example.com');

    expect(site.headers['access-control-allow-origin']).toBe('https://londonchess.ca');
    expect(preview.headers['access-control-allow-origin']).toBe(
      'https://preview.londonchess.ca',
    );
    expect(deployment.headers['access-control-allow-origin']).toBeUndefined();
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should respond with a server error when the database cannot be reached', async () => {
    vi.mocked(connectToDatabase).mockRejectedValueOnce(new Error('refused'));

    const response = await request(app).get('/v1/version');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Unknown error.' });
  });

  it('should answer a route it does not have in JSON', async () => {
    const response = await request(app).get('/v1/nothing-here');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Not found.' });
  });

  it('should explain a body it cannot read in JSON', async () => {
    const response = await request(app)
      .post('/v1/users/account-requests/verification')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(expect.any(String));
  });
});
