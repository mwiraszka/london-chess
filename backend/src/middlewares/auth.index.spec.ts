import request from 'supertest';

import { useTestDatabase } from '../testing/database';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));

describe('offline authentication', () => {
  useTestDatabase();

  it('should let every request through as an admin in offline development', async () => {
    vi.stubEnv('NODE_ENVIRONMENT', 'dev-offline');
    const { app } = await import('../app.js');

    const response = await request(app).get('/v1/admin/members');

    expect(response.status).toBe(200);
  });
});
