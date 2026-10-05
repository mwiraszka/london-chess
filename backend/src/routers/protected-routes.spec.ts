import request from 'supertest';

import { app } from '../app';
import { bearer } from '../testing/clerk.mock';
import { useTestDatabase } from '../testing/database';
import { createMember, memberAccount } from '../testing/fixtures';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

const ID = '64b7f0c2a1d3e4f5a6b7c8d9';

const ADMIN_ROUTES: [Method, string][] = [
  ['post', '/v1/articles'],
  ['put', `/v1/articles/${ID}`],
  ['delete', `/v1/articles/${ID}`],
  ['post', '/v1/events'],
  ['put', `/v1/events/${ID}`],
  ['delete', `/v1/events/${ID}`],
  ['post', '/v1/images'],
  ['put', '/v1/images'],
  ['delete', `/v1/images/${ID}`],
  ['delete', '/v1/images/album/Picnic'],
  ['get', '/v1/admin/members'],
  ['get', '/v1/admin/members/widest'],
  ['get', '/v1/admin/members/number/1'],
  ['get', `/v1/admin/members/${ID}`],
  ['post', '/v1/admin/members'],
  ['put', '/v1/admin/members'],
  ['put', `/v1/admin/members/${ID}`],
  ['delete', `/v1/admin/members/${ID}`],
  ['post', '/v1/tournaments'],
  ['post', '/v1/tournaments/player-matches'],
  ['put', '/v1/tournaments/1'],
  ['post', '/v1/tournaments/1/import-changes'],
  ['delete', '/v1/tournaments/1'],
];

const MEMBER_ROUTES: [Method, string][] = [
  ['get', '/v1/users/me'],
  ['patch', '/v1/users/me'],
  ['delete', '/v1/users/me'],
  ['get', '/v1/users/me/member'],
  ['post', '/v1/users/me/member/change-request'],
  ['get', '/v1/users/me/sessions'],
  ['post', '/v1/users/me/sessions/revoke-others'],
  ['post', '/v1/users/me/password'],
  ['post', '/v1/users/me/password/confirm'],
  ['post', '/v1/users/me/avatar'],
  ['patch', '/v1/users/me/avatar'],
  ['delete', '/v1/users/me/avatar'],
  ['post', '/v1/tournaments/1/registration'],
  ['delete', '/v1/tournaments/1/registration'],
];

describe('protected routes', () => {
  useTestDatabase();

  it.each([...ADMIN_ROUTES, ...MEMBER_ROUTES])(
    'should turn away %s %s without a session',
    async (method, path) => {
      const response = await request(app)[method](path);

      expect(response.status).toBe(401);
    },
  );

  it.each(ADMIN_ROUTES)(
    'should forbid %s %s to a member who is not an admin',
    async (method, path) => {
      await createMember({ account: memberAccount({ clerkUserId: 'user_member' }) });

      const call = request(app)[method](path);
      const response = await call.set('Authorization', bearer('user_member'));

      expect(response.status).toBe(403);
    },
  );
});
