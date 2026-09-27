import request from 'supertest';

import { app } from '../app';
import { MemberModel } from '../models/member.model';
import { bearer, clerkClient, clerkUser, verifyToken } from '../testing/clerk.mock';
import { useTestDatabase } from '../testing/database';
import {
  createAdmin,
  createMember,
  memberAccount,
  readMember,
  startMemberNumbers,
} from '../testing/fixtures';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));

const ADMIN_ROUTE = '/v1/admin/members';

describe('authentication', () => {
  useTestDatabase();

  it('should reject a request without a bearer token', async () => {
    const missing = await request(app).get(ADMIN_ROUTE);
    const wrongScheme = await request(app)
      .get(ADMIN_ROUTE)
      .set('Authorization', 'Basic abc');

    expect(missing.status).toBe(401);
    expect(wrongScheme.status).toBe(401);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('should reject a token Clerk cannot verify', async () => {
    const response = await request(app)
      .get(ADMIN_ROUTE)
      .set('Authorization', 'Bearer forged');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Unable to validate session token.');
  });

  it('should let an admin through to an admin route', async () => {
    await createAdmin('user_admin');

    const response = await request(app)
      .get(ADMIN_ROUTE)
      .set('Authorization', bearer('user_admin'));

    expect(response.status).toBe(200);
    expect(clerkClient.users.getUser).not.toHaveBeenCalled();
  });

  it('should forbid a member without admin rights', async () => {
    await createMember({ account: memberAccount({ clerkUserId: 'user_member' }) });

    const response = await request(app)
      .get(ADMIN_ROUTE)
      .set('Authorization', bearer('user_member'));

    expect(response.status).toBe(403);
  });

  it('should link an account the webhook has not synced yet and use its admin rights', async () => {
    await startMemberNumbers(5);
    const member = await createMember();
    clerkClient.users.getUser.mockResolvedValue(
      clerkUser({
        id: 'user_new',
        publicMetadata: { memberId: member._id.toString(), isAdmin: true },
      }),
    );

    const response = await request(app)
      .get(ADMIN_ROUTE)
      .set('Authorization', bearer('user_new'));

    expect(response.status).toBe(200);
    const linked = await readMember(member._id);
    expect(linked.account).toMatchObject({ clerkUserId: 'user_new', isAdmin: true });
    expect(linked.number).toBe(5);
  });

  it('should treat a user as unprivileged when their account cannot be linked', async () => {
    clerkClient.users.getUser.mockRejectedValue(new Error('Clerk is down'));

    const response = await request(app)
      .get(ADMIN_ROUTE)
      .set('Authorization', bearer('user_unknown'));

    expect(response.status).toBe(403);
    expect(await MemberModel.countDocuments()).toBe(0);
  });
});
