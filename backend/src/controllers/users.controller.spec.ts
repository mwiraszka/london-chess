import request from 'supertest';

import { app } from '../app';
import { AccountVerificationModel } from '../models/account-verification.model';
import { MemberModel } from '../models/member.model';
import { sendAdminEmail, sendEmail } from '../services/email.service';
import { bearer, clerkClient, clerkUser } from '../testing/clerk.mock';
import { useTestDatabase } from '../testing/database';
import { createAccountHolder, createMember, readMember } from '../testing/fixtures';
import { send, sentKeys } from '../testing/storage.mock';
import { hashTemporaryPassword } from '../util/temporary-password.util';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));
vi.mock('../services/storage.service', () => import('../testing/storage.mock.js'));
vi.mock('../services/email.service', () => ({
  sendEmail: vi.fn(),
  sendAdminEmail: vi.fn(),
}));

const USER = 'user_test';
const AVATARS = 'https://avatars.test';
const NOW = new Date('2026-09-26T12:00:00.000Z');
const PNG = Buffer.from('fake image bytes');

function emailedCode(): string {
  const [, email] = vi.mocked(sendEmail).mock.calls[0];
  const code = email.text.match(/\d{6}/)?.[0];
  if (!code) {
    throw new Error('No code was emailed.');
  }
  return code;
}

async function verificationCode(email = 'jane@example.com'): Promise<string> {
  await request(app).post('/v1/users/account-requests/verification').send({ email });
  return emailedCode();
}

function accountRequest(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    yearOfBirth: 1990,
    city: 'London',
    verificationCode: '000000',
    ...overrides,
  };
}

describe('users routes', () => {
  useTestDatabase();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.stubEnv('R2_AVATARS_PUBLIC_URL', AVATARS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('POST /v1/users/account-requests/verification', () => {
    it('should email a six-digit code and keep only its hash', async () => {
      const response = await request(app)
        .post('/v1/users/account-requests/verification')
        .send({ email: 'Jane@Example.com' });

      expect(response.status).toBe(200);
      const code = emailedCode();
      expect(sendEmail).toHaveBeenCalledWith('Jane@Example.com', expect.any(Object));
      const saved = await AccountVerificationModel.findOne({ email: 'jane@example.com' });
      expect(saved?.codeHash).not.toContain(code);
      expect(saved?.expiresAt).toEqual(new Date('2026-09-26T12:10:00.000Z'));
    });

    it('should reject an invalid email address', async () => {
      const response = await request(app)
        .post('/v1/users/account-requests/verification')
        .send({ email: 'nope' });

      expect(response.status).toBe(400);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should wait a minute before sending another code', async () => {
      await verificationCode();
      vi.setSystemTime(new Date(NOW.getTime() + 30 * 1000));

      const tooSoon = await request(app)
        .post('/v1/users/account-requests/verification')
        .send({ email: 'jane@example.com' });
      vi.setSystemTime(new Date(NOW.getTime() + 61 * 1000));
      const later = await request(app)
        .post('/v1/users/account-requests/verification')
        .send({ email: 'jane@example.com' });

      expect(tooSoon.status).toBe(429);
      expect(later.status).toBe(200);
      expect(sendEmail).toHaveBeenCalledTimes(2);
    });

    it('should respond with a server error when the email cannot be sent', async () => {
      vi.mocked(sendEmail).mockRejectedValue(new Error('SMTP down'));

      const response = await request(app)
        .post('/v1/users/account-requests/verification')
        .send({ email: 'jane@example.com' });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /v1/users/account-requests', () => {
    it('should send the verified request to the admin mailbox', async () => {
      const code = await verificationCode();

      const response = await request(app)
        .post('/v1/users/account-requests')
        .send(
          accountRequest({
            verificationCode: code,
            phoneNumber: '519-555-0100',
            lichessUsername: '',
            chessComUsername: ' jane_doe ',
          }),
        );

      expect(response.status).toBe(200);
      const [email] = vi.mocked(sendAdminEmail).mock.calls[0];
      expect(email.subject).toBe('New account request from Jane Doe');
      expect(email.text).toContain('Phone number: 519-555-0100');
      expect(email.text).toContain('Chess.com username: jane_doe');
      expect(email.text).not.toContain('Lichess');
      expect(await AccountVerificationModel.countDocuments()).toBe(0);
    });

    it.each([
      [{ firstName: ' ' }, 'First and last name are required.'],
      [{ lastName: 5 }, 'First and last name are required.'],
      [{ email: 'nope' }, 'A valid email address is required.'],
      [{ yearOfBirth: 2027 }, 'A valid year of birth is required.'],
      [{ yearOfBirth: '1990' }, 'A valid year of birth is required.'],
      [{ verificationCode: '12345' }, 'A six-digit verification code is required.'],
    ])(
      'should reject the request %o before checking the code',
      async (overrides, message) => {
        const response = await request(app)
          .post('/v1/users/account-requests')
          .send(accountRequest(overrides));

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(message);
      },
    );

    it('should reject a code that was never sent or has expired', async () => {
      const code = await verificationCode();
      vi.setSystemTime(new Date(NOW.getTime() + 11 * 60 * 1000));

      const expired = await request(app)
        .post('/v1/users/account-requests')
        .send(accountRequest({ verificationCode: code }));
      const neverSent = await request(app)
        .post('/v1/users/account-requests')
        .send(accountRequest({ email: 'other@example.com' }));

      expect(expired.status).toBe(400);
      expect(expired.body.message).toMatch(/expired/);
      expect(neverSent.body.message).toMatch(/expired/);
      expect(sendAdminEmail).not.toHaveBeenCalled();
    });

    it('should count wrong codes and stop accepting any after five', async () => {
      const code = await verificationCode();
      const wrong = code === '111111' ? '222222' : '111111';
      for (let attempt = 0; attempt < 5; attempt++) {
        await request(app)
          .post('/v1/users/account-requests')
          .send(accountRequest({ verificationCode: wrong }));
      }

      const response = await request(app)
        .post('/v1/users/account-requests')
        .send(accountRequest({ verificationCode: code }));

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/^Too many incorrect attempts/);
      expect(
        (await AccountVerificationModel.findOne({ email: 'jane@example.com' }))?.attempts,
      ).toBe(5);
    });

    it('should tell the requester their code is wrong', async () => {
      const code = await verificationCode();

      const response = await request(app)
        .post('/v1/users/account-requests')
        .send(
          accountRequest({ verificationCode: code === '111111' ? '222222' : '111111' }),
        );

      expect(response.body.message).toBe('That verification code is incorrect.');
    });

    it.each([
      [{ city: '' }, 'City is required.'],
      [{ city: 'x'.repeat(51) }, 'City must be 50 characters or fewer.'],
      [{ phoneNumber: 5195550100 }, 'Phone number must be text.'],
      [{ lichessUsername: 'a' }, expect.stringMatching(/^Lichess username must be/)],
    ])('should reject the details %o after a valid code', async (overrides, message) => {
      const code = await verificationCode();

      const response = await request(app)
        .post('/v1/users/account-requests')
        .send(accountRequest({ ...overrides, verificationCode: code }));

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(message);
    });

    it('should respond with a server error when the admin email cannot be sent', async () => {
      const code = await verificationCode();
      vi.mocked(sendAdminEmail).mockRejectedValue(new Error('SMTP down'));

      const response = await request(app)
        .post('/v1/users/account-requests')
        .send(accountRequest({ verificationCode: code }));

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/users/me', () => {
    it('should return the account of the signed-in member', async () => {
      await createAccountHolder({ temporaryPasswordHash: 'hash' });

      const response = await request(app)
        .get('/v1/users/me')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: USER,
        memberNumber: 1,
        hasTemporaryPassword: true,
      });
    });

    it('should point avatar URLs saved under a retired prefix at the current location', async () => {
      await createAccountHolder({
        avatarOriginalUrl: 'https://old.test/avatars/user_test/original',
        avatarUrl: 'https://old.test/avatars/user_test/cropped',
      });

      const response = await request(app)
        .get('/v1/users/me')
        .set('Authorization', bearer(USER));

      expect(response.body.data).toMatchObject({
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
        avatarUrl: `${AVATARS}/avatars/user_test/cropped`,
      });
      const saved = await MemberModel.findOne({ 'account.clerkUserId': USER }).lean();
      expect(saved?.account?.avatarOriginalUrl).toBe(
        `${AVATARS}/avatars/user_test/original`,
      );
    });

    it('should repair only the original when there is no cropped avatar', async () => {
      await createAccountHolder({
        avatarOriginalUrl: 'https://old.test/avatars/user_test/original',
      });

      const response = await request(app)
        .get('/v1/users/me')
        .set('Authorization', bearer(USER));

      expect(response.body.data.avatarUrl).toBeNull();
    });

    it('should respond with not found for a user without a member record', async () => {
      const response = await request(app)
        .get('/v1/users/me')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(404);
    });

    it('should respond with a server error when avatar storage is not configured', async () => {
      vi.stubEnv('R2_AVATARS_PUBLIC_URL', '');
      await createAccountHolder({
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
      });

      const response = await request(app)
        .get('/v1/users/me')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/users/me/member', () => {
    it("should return the signed-in user's member record", async () => {
      await createAccountHolder();

      const response = await request(app)
        .get('/v1/users/me/member')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ email: 'jane@example.com' });
    });

    it('should respond with not found without a member record', async () => {
      const response = await request(app)
        .get('/v1/users/me/member')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(404);
    });

    it('should respond with a server error when the database fails after sign-in', async () => {
      await createAccountHolder();
      const findOne = MemberModel.findOne.bind(MemberModel);
      vi.spyOn(MemberModel, 'findOne')
        .mockImplementationOnce(findOne)
        .mockImplementation(() => {
          throw new Error('down');
        });

      const response = await request(app)
        .get('/v1/users/me/member')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(500);
    });
  });

  describe('POST /v1/users/me/member/change-request', () => {
    it('should send the changed details to the admin mailbox', async () => {
      await createAccountHolder();

      const response = await request(app)
        .post('/v1/users/me/member/change-request')
        .set('Authorization', bearer(USER))
        .send({ city: ' Toronto ', lastName: 'Doe', phoneNumber: '519-555-0100' });

      expect(response.status).toBe(200);
      const [email] = vi.mocked(sendAdminEmail).mock.calls[0];
      expect(email.subject).toBe('Member details change request from Jane Doe');
      expect(email.text).toContain('City: current London, requested Toronto');
      expect(email.text).toContain(
        'Phone number: current (empty), requested 519-555-0100',
      );
      expect(email.text).not.toContain('Last name');
    });

    it('should reject details that are not text or are invalid', async () => {
      await createAccountHolder();

      const notText = await request(app)
        .post('/v1/users/me/member/change-request')
        .set('Authorization', bearer(USER))
        .send({ city: 5 });
      const invalid = await request(app)
        .post('/v1/users/me/member/change-request')
        .set('Authorization', bearer(USER))
        .send({ yearOfBirth: '90' });

      expect(notText.status).toBe(400);
      expect(invalid.status).toBe(400);
      expect(sendAdminEmail).not.toHaveBeenCalled();
    });

    it('should reject a request that changes nothing', async () => {
      await createAccountHolder();

      const response = await request(app)
        .post('/v1/users/me/member/change-request')
        .set('Authorization', bearer(USER))
        .send({ city: 'London' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No changes were requested.');
    });

    it('should respond with not found without a member record', async () => {
      const response = await request(app)
        .post('/v1/users/me/member/change-request')
        .set('Authorization', bearer(USER))
        .send({ city: 'Toronto' });

      expect(response.status).toBe(404);
    });

    it('should respond with a server error when the admin email cannot be sent', async () => {
      await createAccountHolder();
      vi.mocked(sendAdminEmail).mockRejectedValue(new Error('SMTP down'));

      const response = await request(app)
        .post('/v1/users/me/member/change-request')
        .set('Authorization', bearer(USER))
        .send({ city: 'Toronto' });

      expect(response.status).toBe(500);
    });
  });

  describe('sessions', () => {
    const sessions = [
      {
        id: 'sess_current',
        lastActiveAt: 2,
        latestActivity: { isMobile: false, browserName: 'Firefox', deviceType: 'Mac' },
      },
      { id: 'sess_phone', lastActiveAt: 1 },
    ];

    it('should list active sessions and mark the current one', async () => {
      clerkClient.sessions.getSessionList.mockResolvedValue({ data: sessions });

      const response = await request(app)
        .get('/v1/users/me/sessions')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([
        {
          id: 'sess_current',
          isCurrent: true,
          isMobile: false,
          browserName: 'Firefox',
          deviceType: 'Mac',
          lastActiveAt: 2,
        },
        {
          id: 'sess_phone',
          isCurrent: false,
          isMobile: false,
          browserName: null,
          deviceType: null,
          lastActiveAt: 1,
        },
      ]);
    });

    it('should revoke every session but the current one', async () => {
      clerkClient.sessions.getSessionList.mockResolvedValue({ data: sessions });

      const response = await request(app)
        .post('/v1/users/me/sessions/revoke-others')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(200);
      expect(clerkClient.sessions.revokeSession).toHaveBeenCalledOnce();
      expect(clerkClient.sessions.revokeSession).toHaveBeenCalledWith('sess_phone');
    });

    it('should respond with a server error when Clerk fails', async () => {
      clerkClient.sessions.getSessionList.mockRejectedValue(new Error('Clerk is down'));

      const list = await request(app)
        .get('/v1/users/me/sessions')
        .set('Authorization', bearer(USER));
      const revoke = await request(app)
        .post('/v1/users/me/sessions/revoke-others')
        .set('Authorization', bearer(USER));

      expect(list.status).toBe(500);
      expect(revoke.status).toBe(500);
    });
  });

  describe('PATCH /v1/users/me', () => {
    it('should save the crop state, Clerk image and year of birth preference', async () => {
      await createAccountHolder();

      const response = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', bearer(USER))
        .send({
          avatarCropState: { zoom: 2, offsetX: 1, offsetY: -1, extra: true },
          clerkImageUrl: 'https://img.clerk.com/photo',
          showYearOfBirth: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        avatarCropState: { zoom: 2, offsetX: 1, offsetY: -1 },
        clerkImageUrl: 'https://img.clerk.com/photo',
        showYearOfBirth: true,
      });
    });

    it('should clear a crop state that is null or malformed', async () => {
      await createAccountHolder({ avatarCropState: { zoom: 2, offsetX: 0, offsetY: 0 } });

      const cleared = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', bearer(USER))
        .send({ avatarCropState: null });
      const malformed = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', bearer(USER))
        .send({ avatarCropState: { zoom: 'big' } });

      expect(cleared.body.data.avatarCropState).toBeNull();
      expect(malformed.body.data.avatarCropState).toBeNull();
    });

    it('should reject a Clerk image or preference of the wrong type', async () => {
      await createAccountHolder();

      const badImage = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', bearer(USER))
        .send({ clerkImageUrl: 5 });
      const badPreference = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', bearer(USER))
        .send({ showYearOfBirth: 'yes' });

      expect(badImage.status).toBe(400);
      expect(badPreference.status).toBe(400);
    });

    it('should respond with not found without a member record', async () => {
      const response = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', bearer(USER))
        .send({ clerkImageUrl: null });

      expect(response.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      await createAccountHolder();
      vi.spyOn(MemberModel, 'findOneAndUpdate').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', bearer(USER))
        .send({});

      expect(response.status).toBe(500);
    });
  });

  describe('POST /v1/users/me/password', () => {
    it('should check the current password, set the new one and clear the temporary one', async () => {
      await createAccountHolder({ temporaryPasswordHash: 'hash' });

      const response = await request(app)
        .post('/v1/users/me/password')
        .set('Authorization', bearer(USER))
        .send({ currentPassword: 'old-password', newPassword: 'new-password' });

      expect(response.status).toBe(200);
      expect(clerkClient.users.verifyPassword).toHaveBeenCalledWith({
        userId: USER,
        password: 'old-password',
      });
      expect(clerkClient.users.updateUser).toHaveBeenCalledWith(USER, {
        password: 'new-password',
      });
      const saved = await MemberModel.findOne({ 'account.clerkUserId': USER }).lean();
      expect(saved?.account?.temporaryPasswordHash).toBeNull();
    });

    it('should not need a current password for an account without one', async () => {
      clerkClient.users.getUser.mockResolvedValue(clerkUser({ passwordEnabled: false }));

      const response = await request(app)
        .post('/v1/users/me/password')
        .set('Authorization', bearer(USER))
        .send({ newPassword: 'new-password' });

      expect(response.status).toBe(200);
      expect(clerkClient.users.verifyPassword).not.toHaveBeenCalled();
    });

    it('should reject a short new password or a missing current password', async () => {
      const short = await request(app)
        .post('/v1/users/me/password')
        .set('Authorization', bearer(USER))
        .send({ currentPassword: 'old-password', newPassword: 'short' });
      const missing = await request(app)
        .post('/v1/users/me/password')
        .set('Authorization', bearer(USER))
        .send({ newPassword: 'new-password' });

      expect(short.status).toBe(400);
      expect(missing.body.message).toBe('Current password is required.');
      expect(clerkClient.users.updateUser).not.toHaveBeenCalled();
    });

    it('should reject an incorrect current password', async () => {
      clerkClient.users.verifyPassword.mockRejectedValue(new Error('Incorrect'));

      const response = await request(app)
        .post('/v1/users/me/password')
        .set('Authorization', bearer(USER))
        .send({ currentPassword: 'wrong', newPassword: 'new-password' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Current password is incorrect.');
    });

    it('should pass on why Clerk refused the new password', async () => {
      clerkClient.users.updateUser.mockRejectedValue(new Error('Refused'));

      const response = await request(app)
        .post('/v1/users/me/password')
        .set('Authorization', bearer(USER))
        .send({ currentPassword: 'old-password', newPassword: 'new-password' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Could not update password.');
    });

    it('should respond with a server error when Clerk cannot find the user', async () => {
      clerkClient.users.getUser.mockRejectedValue(new Error('Clerk is down'));

      const response = await request(app)
        .post('/v1/users/me/password')
        .set('Authorization', bearer(USER))
        .send({ newPassword: 'new-password' });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /v1/users/me/password/confirm', () => {
    it('should clear the temporary password once the member confirms their own', async () => {
      await createAccountHolder({
        temporaryPasswordHash: hashTemporaryPassword('Temp4Pass'),
      });

      const response = await request(app)
        .post('/v1/users/me/password/confirm')
        .set('Authorization', bearer(USER))
        .send({ password: 'my-own-password' });

      expect(response.status).toBe(200);
      expect(response.body.data.hasTemporaryPassword).toBe(false);
    });

    it('should keep the temporary password when it is the one confirmed', async () => {
      await createAccountHolder({
        temporaryPasswordHash: hashTemporaryPassword('Temp4Pass'),
      });

      const response = await request(app)
        .post('/v1/users/me/password/confirm')
        .set('Authorization', bearer(USER))
        .send({ password: 'Temp4Pass' });

      expect(response.body.data.hasTemporaryPassword).toBe(true);
      expect(clerkClient.users.verifyPassword).not.toHaveBeenCalled();
    });

    it('should accept any password for a member without a temporary one', async () => {
      await createAccountHolder();

      const response = await request(app)
        .post('/v1/users/me/password/confirm')
        .set('Authorization', bearer(USER))
        .send({ password: 'anything' });

      expect(response.status).toBe(200);
      expect(clerkClient.users.verifyPassword).not.toHaveBeenCalled();
    });

    it('should reject a password that does not match the account', async () => {
      const member = await createAccountHolder({ temporaryPasswordHash: 'hash' });
      clerkClient.users.verifyPassword.mockRejectedValue(new Error('Incorrect'));

      const response = await request(app)
        .post('/v1/users/me/password/confirm')
        .set('Authorization', bearer(USER))
        .send({ password: 'wrong' });

      expect(response.status).toBe(400);
      expect((await readMember(member._id)).account?.temporaryPasswordHash).toBe('hash');
    });

    it('should need a password and a member record', async () => {
      const missingPassword = await request(app)
        .post('/v1/users/me/password/confirm')
        .set('Authorization', bearer(USER))
        .send({});
      const missingMember = await request(app)
        .post('/v1/users/me/password/confirm')
        .set('Authorization', bearer(USER))
        .send({ password: 'anything' });

      expect(missingPassword.status).toBe(400);
      expect(missingMember.status).toBe(404);
    });

    it('should respond with not found when the account is unlinked while confirming', async () => {
      await createAccountHolder({ temporaryPasswordHash: 'hash' });
      clerkClient.users.verifyPassword.mockImplementation(async () => {
        await MemberModel.updateOne({}, { $set: { account: null } });
        return { verified: true };
      });

      const response = await request(app)
        .post('/v1/users/me/password/confirm')
        .set('Authorization', bearer(USER))
        .send({ password: 'my-own-password' });

      expect(response.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      await createAccountHolder({ temporaryPasswordHash: 'hash' });
      vi.spyOn(MemberModel, 'findOneAndUpdate').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app)
        .post('/v1/users/me/password/confirm')
        .set('Authorization', bearer(USER))
        .send({ password: 'my-own-password' });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /v1/users/me/avatar', () => {
    it('should store both images, set the Clerk photo and save the crop', async () => {
      await createAccountHolder();

      const response = await request(app)
        .post('/v1/users/me/avatar')
        .set('Authorization', bearer(USER))
        .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' })
        .attach('cropped', PNG, { filename: 'cropped.png', contentType: 'image/png' })
        .field('cropState', JSON.stringify({ zoom: 1.5, offsetX: 2, offsetY: 3 }));

      expect(response.status).toBe(200);
      expect(sentKeys().sort()).toEqual([
        'avatars/user_test/cropped',
        'avatars/user_test/original',
      ]);
      expect(response.body.data).toMatchObject({
        avatarUrl: `${AVATARS}/avatars/user_test/cropped`,
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
        avatarCropState: { zoom: 1.5, offsetX: 2, offsetY: 3 },
        clerkImageUrl: 'https://img.clerk.com/uploaded',
        avatarUpdatedAt: NOW.toISOString(),
      });
      const saved = await MemberModel.findOne().lean();
      expect(saved?.account?.clerkImagePending).toBe(false);
    });

    it('should ignore a crop state that is not valid JSON', async () => {
      await createAccountHolder();

      const response = await request(app)
        .post('/v1/users/me/avatar')
        .set('Authorization', bearer(USER))
        .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' })
        .attach('cropped', PNG, { filename: 'cropped.png', contentType: 'image/png' })
        .field('cropState', '{');

      expect(response.body.data.avatarCropState).toBeNull();
    });

    it('should need a supported image and its cropped version', async () => {
      const missing = await request(app)
        .post('/v1/users/me/avatar')
        .set('Authorization', bearer(USER));
      const wrongType = await request(app)
        .post('/v1/users/me/avatar')
        .set('Authorization', bearer(USER))
        .attach('file', PNG, { filename: 'photo.gif', contentType: 'image/gif' });
      const withoutCrop = await request(app)
        .post('/v1/users/me/avatar')
        .set('Authorization', bearer(USER))
        .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' });

      expect(missing.body.message).toBe('File is required.');
      expect(wrongType.body.message).toBe('File must be a JPEG, PNG, or WebP image.');
      expect(withoutCrop.body.message).toBe('Cropped file is required.');
      expect(send).not.toHaveBeenCalled();
    });

    it('should respond with not found without a member record', async () => {
      const response = await request(app)
        .post('/v1/users/me/avatar')
        .set('Authorization', bearer(USER))
        .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' })
        .attach('cropped', PNG, { filename: 'cropped.png', contentType: 'image/png' });

      expect(response.status).toBe(404);
    });

    it('should respond with a server error when storage fails', async () => {
      send.mockRejectedValue(new Error('R2 down'));

      const response = await request(app)
        .post('/v1/users/me/avatar')
        .set('Authorization', bearer(USER))
        .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' })
        .attach('cropped', PNG, { filename: 'cropped.png', contentType: 'image/png' });

      expect(response.status).toBe(500);
    });
  });

  describe('PATCH /v1/users/me/avatar', () => {
    it('should replace only the cropped image', async () => {
      await createAccountHolder({
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
      });

      const response = await request(app)
        .patch('/v1/users/me/avatar')
        .set('Authorization', bearer(USER))
        .attach('cropped', PNG, { filename: 'cropped.webp', contentType: 'image/webp' })
        .field('cropState', JSON.stringify({ zoom: 2, offsetX: 0, offsetY: 0 }));

      expect(response.status).toBe(200);
      expect(sentKeys()).toEqual(['avatars/user_test/cropped']);
      expect(response.body.data).toMatchObject({
        avatarUrl: `${AVATARS}/avatars/user_test/cropped`,
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
        avatarCropState: { zoom: 2, offsetX: 0, offsetY: 0 },
      });
    });

    it('should need the cropped image', async () => {
      const response = await request(app)
        .patch('/v1/users/me/avatar')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(400);
    });

    it('should respond with not found without a member record', async () => {
      const response = await request(app)
        .patch('/v1/users/me/avatar')
        .set('Authorization', bearer(USER))
        .attach('cropped', PNG, { filename: 'cropped.png', contentType: 'image/png' });

      expect(response.status).toBe(404);
    });

    it('should respond with a server error when Clerk fails', async () => {
      clerkClient.users.updateUserProfileImage.mockRejectedValue(
        new Error('Clerk is down'),
      );

      const response = await request(app)
        .patch('/v1/users/me/avatar')
        .set('Authorization', bearer(USER))
        .attach('cropped', PNG, { filename: 'cropped.png', contentType: 'image/png' });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /v1/users/me/avatar', () => {
    it('should remove the stored images and clear the avatar', async () => {
      await createAccountHolder({
        avatarUrl: `${AVATARS}/avatars/user_test/cropped`,
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
        clerkImageUrl: 'https://img.clerk.com/photo',
      });

      const response = await request(app)
        .delete('/v1/users/me/avatar')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(200);
      expect(sentKeys().sort()).toEqual([
        'avatars/user_test/cropped',
        'avatars/user_test/original',
      ]);
      expect(clerkClient.users.deleteUserProfileImage).toHaveBeenCalledWith(USER);
      expect(response.body.data).toMatchObject({
        avatarUrl: null,
        avatarOriginalUrl: null,
        clerkImageUrl: null,
      });
    });

    it('should keep a photo Clerk still has for the user', async () => {
      await createAccountHolder();
      clerkClient.users.getUser.mockResolvedValue(
        clerkUser({ hasImage: true, imageUrl: 'https://img.clerk.com/social' }),
      );

      const response = await request(app)
        .delete('/v1/users/me/avatar')
        .set('Authorization', bearer(USER));

      expect(response.body.data.clerkImageUrl).toBe('https://img.clerk.com/social');
    });

    it('should respond with not found without a member record', async () => {
      const response = await request(app)
        .delete('/v1/users/me/avatar')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(404);
    });

    it('should respond with a server error when storage fails', async () => {
      send.mockRejectedValue(new Error('R2 down'));

      const response = await request(app)
        .delete('/v1/users/me/avatar')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /v1/users/me', () => {
    it('should delete the Clerk user and keep the member record without its account', async () => {
      const member = await createAccountHolder();

      const response = await request(app)
        .delete('/v1/users/me')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(200);
      expect(clerkClient.users.deleteUser).toHaveBeenCalledWith(USER);
      expect((await readMember(member._id)).account).toBeNull();
    });

    it('should carry on when there is no stored avatar to delete', async () => {
      const member = await createAccountHolder();
      send.mockRejectedValue(new Error('Not found'));

      const response = await request(app)
        .delete('/v1/users/me')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(200);
      expect((await readMember(member._id)).account).toBeNull();
    });

    it('should keep the account when Clerk cannot delete the user', async () => {
      const member = await createAccountHolder();
      clerkClient.users.deleteUser.mockRejectedValue(new Error('Clerk is down'));

      const response = await request(app)
        .delete('/v1/users/me')
        .set('Authorization', bearer(USER));

      expect(response.status).toBe(500);
      expect((await readMember(member._id)).account).not.toBeNull();
    });
  });

  describe('GET /v1/users/:id/avatar', () => {
    it("should proxy the member's stored original avatar", async () => {
      await createAccountHolder({
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
      });
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          new Response(PNG, { headers: { 'content-type': 'image/png' } }),
        );

      const response = await request(app).get(`/v1/users/${USER}/avatar`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
      expect(response.headers['cache-control']).toBe('public, max-age=3600');
      expect(Buffer.compare(response.body, PNG)).toBe(0);
      expect(fetchSpy).toHaveBeenCalledWith(`${AVATARS}/avatars/user_test/original`);
    });

    it('should default the content type to JPEG', async () => {
      await createAccountHolder({
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array(PNG)));

      const response = await request(app).get(`/v1/users/${USER}/avatar`);

      expect(response.headers['content-type']).toBe('image/jpeg');
    });

    it('should never fetch an avatar stored outside the avatar bucket', async () => {
      await createAccountHolder({ avatarOriginalUrl: 'http://169.254.169.254/latest' });
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const response = await request(app).get(`/v1/users/${USER}/avatar`);

      expect(response.status).toBe(404);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should respond with not found for a member without an avatar', async () => {
      await createMember();

      const response = await request(app).get(`/v1/users/${USER}/avatar`);

      expect(response.status).toBe(404);
    });

    it('should respond with a bad gateway when storage refuses the image', async () => {
      await createAccountHolder({
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 404 }),
      );

      const response = await request(app).get(`/v1/users/${USER}/avatar`);

      expect(response.status).toBe(502);
    });

    it('should respond with a server error when the image cannot be fetched', async () => {
      await createAccountHolder({
        avatarOriginalUrl: `${AVATARS}/avatars/user_test/original`,
      });
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

      const response = await request(app).get(`/v1/users/${USER}/avatar`);

      expect(response.status).toBe(500);
    });
  });
});
