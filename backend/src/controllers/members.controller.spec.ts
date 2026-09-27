import { ClerkAPIResponseError } from '@clerk/backend/errors';
import { Types } from 'mongoose';
import request from 'supertest';

import { app } from '../app';
import { MemberModel } from '../models/member.model';
import { sendEmail } from '../services/email.service';
import { bearer, clerkClient } from '../testing/clerk.mock';
import { useTestDatabase } from '../testing/database';
import {
  createAdmin,
  createMember,
  memberAccount,
  memberFields,
  readMember,
  startMemberNumbers,
} from '../testing/fixtures';
import { AdminMember, PublicMember } from '../util/member-responses.util';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));
vi.mock('../services/email.service', () => ({
  sendEmail: vi.fn(),
  sendAdminEmail: vi.fn(),
}));

const ADMIN = 'user_admin';
const SITE = 'https://londonchess.ca';

function clerkError(code: string, longMessage: string): ClerkAPIResponseError {
  return new ClerkAPIResponseError(longMessage, {
    status: 422,
    data: [{ code, message: longMessage, long_message: longMessage, meta: {} }],
  });
}

describe('members routes', () => {
  useTestDatabase();

  describe('GET /v1/public/members', () => {
    it('should return only public details', async () => {
      await createMember({ phoneNumber: '519-555-0100' });

      const response = await request(app).get('/v1/public/members');

      expect(response.status).toBe(200);
      const [member]: PublicMember[] = response.body.data.items;
      expect(member.firstName).toBe('Jane');
      expect(member).not.toHaveProperty('email');
      expect(JSON.stringify(member)).not.toContain('519-555-0100');
    });

    it('should sort ratings numerically, placing a provisional rating below an established one', async () => {
      await createMember({ lastName: 'Provisional', rating: '1800/12' });
      await createMember({ lastName: 'Established', rating: '1800' });
      await createMember({ lastName: 'Higher', rating: '1900' });
      await createMember({ lastName: 'Lower', rating: '950' });

      const response = await request(app).get(
        '/v1/public/members?sortBy=rating&sortOrder=desc&page=1&pageSize=3',
      );

      expect(
        response.body.data.items.map((member: PublicMember) => member.lastName),
      ).toEqual(['Higher', 'Established', 'Provisional']);
      expect(response.body.data.items[0]).not.toHaveProperty('email');
      expect(response.body.data.filteredCount).toBe(4);
    });

    it('should leave out inactive members when asked', async () => {
      await createMember({ lastName: 'Active' });
      await createMember({ lastName: 'Inactive', isActive: false });

      const response = await request(app).get(
        '/v1/public/members?filter_showInactiveMembers=false',
      );

      expect(
        response.body.data.items.map((member: PublicMember) => member.lastName),
      ).toEqual(['Active']);
      expect(response.body.data.totalCount).toBe(2);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(MemberModel, 'countDocuments').mockRejectedValue(new Error('down'));

      const response = await request(app).get('/v1/public/members');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/public/members/profiles', () => {
    it('should list only members with an account and a number', async () => {
      await createMember({
        number: 3,
        account: memberAccount({ clerkUserId: 'user_3' }),
      });
      await createMember({ number: 4 });
      await createMember({ lastName: 'Unnumbered' });

      const response = await request(app).get('/v1/public/members/profiles');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([
        { number: 3, firstName: 'Jane', lastName: 'Doe', avatarUrl: null },
      ]);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(MemberModel, 'find').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get('/v1/public/members/profiles');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/public/members/widest', () => {
    it('should return public details of the members holding the widest text', async () => {
      await createMember({ lastName: 'Montgomery-Wolfenden', city: 'St. Thomas' });

      const response = await request(app).get('/v1/public/members/widest');

      expect(response.status).toBe(200);
      expect(response.body.data[0].lastName).toBe('Montgomery-Wolfenden');
      expect(response.body.data[0]).not.toHaveProperty('email');
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(MemberModel, 'aggregate').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get('/v1/public/members/widest');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/public/members/:number', () => {
    it('should return the public profile of a member with an account', async () => {
      await createMember({
        number: 7,
        account: memberAccount(),
        preferences: { showYearOfBirth: true },
      });

      const response = await request(app).get('/v1/public/members/7');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        number: 7,
        yearOfBirth: '1990',
        yearJoined: '2022',
      });
      expect(response.body.data).not.toHaveProperty('email');
    });

    it('should respond with not found for a member without an account or a malformed number', async () => {
      await createMember({ number: 8 });

      const withoutAccount = await request(app).get('/v1/public/members/8');
      const malformed = await request(app).get('/v1/public/members/abc');

      expect(withoutAccount.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(MemberModel, 'findOne').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get('/v1/public/members/7');

      expect(response.status).toBe(500);
    });
  });

  describe('admin reads', () => {
    it('should list members with their private details', async () => {
      await createAdmin(ADMIN);
      await createMember({ rating: '1200', phoneNumber: '519-555-0100' });

      const response = await request(app)
        .get('/v1/admin/members?sortBy=rating&sortOrder=asc')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(200);
      const members: AdminMember[] = response.body.data.items;
      expect(members.map(member => member.email)).toEqual([
        'jane@example.com',
        'admin@example.com',
      ]);
      expect(members[0].phoneNumber).toBe('519-555-0100');
      expect(members[0]).not.toHaveProperty('ratingNumeric');
    });

    it('should return the widest members with their private details', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .get('/v1/admin/members/widest')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(200);
      expect(response.body.data[0].email).toBe('admin@example.com');
    });

    it('should find a member by number with their private details', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .get('/v1/admin/members/number/100')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ email: 'admin@example.com' });
    });

    it('should find a member by id', async () => {
      await createAdmin(ADMIN);
      const member = await createMember();

      const found = await request(app)
        .get(`/v1/admin/members/${member._id}`)
        .set('Authorization', bearer(ADMIN));
      const unknown = await request(app)
        .get(`/v1/admin/members/${new Types.ObjectId()}`)
        .set('Authorization', bearer(ADMIN));
      const malformed = await request(app)
        .get('/v1/admin/members/not-an-id')
        .set('Authorization', bearer(ADMIN));

      expect(found.body.data).toMatchObject({ id: member._id.toString() });
      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should respond with a server error when finding a member by id fails', async () => {
      await createAdmin(ADMIN);
      vi.spyOn(MemberModel, 'findById').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app)
        .get(`/v1/admin/members/${new Types.ObjectId()}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(500);
    });
  });

  describe('POST /v1/admin/members', () => {
    it('should save a member without an account', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .post('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .send(memberFields({ firstName: 'New' }));

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({ firstName: 'New', hasAccount: false });
      const saved = await readMember(response.body.data.id);
      expect(saved.modificationInfo.createdBy).toBe('Ada Admin');
      expect(clerkClient.users.createUser).not.toHaveBeenCalled();
    });

    it('should reject invalid members and modification info', async () => {
      await createAdmin(ADMIN);

      const invalidMember = await request(app)
        .post('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .send({ ...memberFields(), isActive: 'yes' });
      const invalidInfo = await request(app)
        .post('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .send({ ...memberFields(), modificationInfo: {} });

      expect(invalidMember.status).toBe(400);
      expect(invalidMember.body.message).toMatch(/^Invalid member:/);
      expect(invalidInfo.status).toBe(400);
      expect(invalidInfo.body.message).toMatch(/^Invalid member modification info:/);
    });

    it('should only send a welcome email from the site', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .post('/v1/admin/members?notify=true')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', 'https://evil.example.com')
        .send(memberFields());

      expect(response.status).toBe(400);
      expect(await MemberModel.countDocuments()).toBe(1);
    });

    it('should create an account, number the member and email their login details', async () => {
      await createAdmin(ADMIN);
      await startMemberNumbers(12);

      const response = await request(app)
        .post('/v1/admin/members?notify=true')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields());

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({ number: 12, hasAccount: true });
      const saved = await readMember(response.body.data.id);
      expect(saved.account?.clerkUserId).toBe('user_new');
      expect(saved.account?.temporaryPasswordHash).toMatch(/^[a-f\d]{64}$/);
      expect(clerkClient.users.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          emailAddress: ['jane@example.com'],
          publicMetadata: { memberId: response.body.data.id },
        }),
      );
      expect(sendEmail).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({
          text: expect.stringContaining(`${SITE}/members/12`),
        }),
      );
    });

    it('should need a valid email and year of birth to create an account', async () => {
      await createAdmin(ADMIN);

      const badEmail = await request(app)
        .post('/v1/admin/members?notify=true')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields({ email: 'nope' }));
      const badYear = await request(app)
        .post('/v1/admin/members?notify=true')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields({ yearOfBirth: '90' }));

      expect(badEmail.status).toBe(400);
      expect(badYear.status).toBe(400);
      expect(clerkClient.users.createUser).not.toHaveBeenCalled();
    });

    it('should explain when Clerk refuses the account', async () => {
      await createAdmin(ADMIN);
      clerkClient.users.createUser
        .mockRejectedValueOnce(clerkError('form_identifier_exists', 'Taken'))
        .mockRejectedValueOnce(clerkError('form_password_pwned', 'Password is weak'));

      const taken = await request(app)
        .post('/v1/admin/members?notify=true')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields());
      const other = await request(app)
        .post('/v1/admin/members?notify=true')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields());

      expect(taken.status).toBe(400);
      expect(taken.body.message).toBe(
        'That email address is taken. Please check the email and try again.',
      );
      expect(other.body.message).toBe('Password is weak.');
      expect(await MemberModel.countDocuments()).toBe(1);
    });

    it('should undo the account and the record when the welcome email fails', async () => {
      await createAdmin(ADMIN);
      await startMemberNumbers(12);
      vi.mocked(sendEmail).mockRejectedValue(new Error('SMTP down'));

      const response = await request(app)
        .post('/v1/admin/members?notify=true')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields());

      expect(response.status).toBe(500);
      expect(response.body.message).toBe(
        'Unable to send the welcome email, so nothing was saved. SMTP down.',
      );
      expect(clerkClient.users.deleteUser).toHaveBeenCalledWith('user_new');
      expect(await MemberModel.countDocuments()).toBe(1);
    });

    it('should name what could not be undone when a number cannot be assigned', async () => {
      await createAdmin(ADMIN);
      clerkClient.users.deleteUser.mockRejectedValue(new Error('Clerk is down'));

      const response = await request(app)
        .post('/v1/admin/members?notify=true')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields());

      expect(response.status).toBe(500);
      expect(response.body.message).toMatch(
        /^Unable to assign a member number, and the site could not remove their new Clerk account\./,
      );
      expect(await MemberModel.countDocuments()).toBe(1);
    });
  });

  describe('PUT /v1/admin/members/:id', () => {
    it('should update a member without an account', async () => {
      await createAdmin(ADMIN);
      const member = await createMember();

      const response = await request(app)
        .put(`/v1/admin/members/${member._id}`)
        .set('Authorization', bearer(ADMIN))
        .send(memberFields({ city: 'Toronto' }));

      expect(response.status).toBe(200);
      expect((await readMember(member._id)).city).toBe('Toronto');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should reject an invalid member or an unknown id', async () => {
      await createAdmin(ADMIN);

      const invalid = await request(app)
        .put(`/v1/admin/members/${new Types.ObjectId()}`)
        .set('Authorization', bearer(ADMIN))
        .send({ firstName: 'Only' });
      const unknown = await request(app)
        .put(`/v1/admin/members/${new Types.ObjectId()}`)
        .set('Authorization', bearer(ADMIN))
        .send(memberFields());
      const malformed = await request(app)
        .put('/v1/admin/members/not-an-id')
        .set('Authorization', bearer(ADMIN))
        .send(memberFields());

      expect(invalid.status).toBe(400);
      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should not change the email of a member with an account', async () => {
      await createAdmin(ADMIN);
      const member = await createMember({ number: 5, account: memberAccount() });

      const response = await request(app)
        .put(`/v1/admin/members/${member._id}`)
        .set('Authorization', bearer(ADMIN))
        .send(memberFields({ email: 'new@example.com' }));

      expect(response.status).toBe(400);
      expect((await readMember(member._id)).email).toBe('jane@example.com');
    });

    it('should only email the member from the site', async () => {
      await createAdmin(ADMIN);
      const member = await createMember();

      const response = await request(app)
        .put(`/v1/admin/members/${member._id}?notify=true`)
        .set('Authorization', bearer(ADMIN))
        .send(memberFields());

      expect(response.status).toBe(400);
    });

    it('should rename an account holder in Clerk and email them the changes', async () => {
      await createAdmin(ADMIN);
      const member = await createMember({ number: 5, account: memberAccount() });

      const response = await request(app)
        .put(`/v1/admin/members/${member._id}?notify=true`)
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields({ firstName: 'Janet' }));

      expect(response.status).toBe(200);
      expect(clerkClient.users.updateUser).toHaveBeenCalledWith('user_test', {
        firstName: 'Janet',
        lastName: 'Doe',
      });
      expect((await readMember(member._id)).firstName).toBe('Janet');
      expect(sendEmail).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({ text: expect.stringContaining(`${SITE}/members/5`) }),
      );
    });

    it('should save an account holder quietly without notify', async () => {
      await createAdmin(ADMIN);
      const member = await createMember({ number: 5, account: memberAccount() });

      const response = await request(app)
        .put(`/v1/admin/members/${member._id}`)
        .set('Authorization', bearer(ADMIN))
        .send(memberFields({ rating: '1550' }));

      expect(response.status).toBe(200);
      expect(clerkClient.users.updateUser).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should put back the account holder's record and Clerk name when the email fails", async () => {
      await createAdmin(ADMIN);
      const member = await createMember({ number: 5, account: memberAccount() });
      vi.mocked(sendEmail).mockRejectedValue(new Error('SMTP down'));

      const response = await request(app)
        .put(`/v1/admin/members/${member._id}?notify=true`)
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields({ firstName: 'Janet' }));

      expect(response.status).toBe(500);
      expect(response.body.message).toMatch(
        /^Unable to email the member about the changes/,
      );
      expect((await readMember(member._id)).firstName).toBe('Jane');
      expect(clerkClient.users.updateUser).toHaveBeenLastCalledWith('user_test', {
        firstName: 'Jane',
        lastName: 'Doe',
      });
    });

    it('should give a member without an account one when notified', async () => {
      await createAdmin(ADMIN);
      await startMemberNumbers(20);
      const member = await createMember();

      const response = await request(app)
        .put(`/v1/admin/members/${member._id}?notify=true`)
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields({ city: 'Toronto' }));

      expect(response.status).toBe(200);
      const saved = await readMember(member._id);
      expect(saved).toMatchObject({ city: 'Toronto', number: 20 });
      expect(saved.account?.clerkUserId).toBe('user_new');
      expect(sendEmail).toHaveBeenCalledOnce();
    });

    it('should undo the new account when another was linked to the member meanwhile', async () => {
      await createAdmin(ADMIN);
      const member = await createMember();
      clerkClient.users.createUser.mockImplementation(async () => {
        await MemberModel.updateOne(
          { _id: member._id },
          { $set: { account: memberAccount({ clerkUserId: 'user_other' }) } },
        );
        return { id: 'user_new' };
      });

      const response = await request(app)
        .put(`/v1/admin/members/${member._id}?notify=true`)
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields());

      expect(response.status).toBe(500);
      expect(response.body.message).toContain(
        'Another account was linked to this member at the same time.',
      );
      expect(clerkClient.users.deleteUser).toHaveBeenCalledWith('user_new');
    });

    it('should restore the record when a new account cannot be numbered', async () => {
      await createAdmin(ADMIN);
      const member = await createMember();

      const response = await request(app)
        .put(`/v1/admin/members/${member._id}?notify=true`)
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(memberFields({ city: 'Toronto' }));

      expect(response.status).toBe(500);
      const restored = await readMember(member._id);
      expect(restored.city).toBe('London');
      expect(restored.account).toBeNull();
    });

    it('should respond with a server error when the database fails', async () => {
      await createAdmin(ADMIN);
      const member = await createMember();
      vi.spyOn(MemberModel, 'updateOne').mockRejectedValue(new Error('down'));

      const response = await request(app)
        .put(`/v1/admin/members/${member._id}`)
        .set('Authorization', bearer(ADMIN))
        .send(memberFields());

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /v1/admin/members', () => {
    it('should reject a body that is not a list of valid members', async () => {
      await createAdmin(ADMIN);

      const empty = await request(app)
        .put('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .send([]);
      const badId = await request(app)
        .put('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .send([{ ...memberFields(), id: 'nope' }]);
      const badMember = await request(app)
        .put('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .send([{ id: new Types.ObjectId().toString(), rating: 1500 }]);

      expect(empty.status).toBe(400);
      expect(badId.status).toBe(400);
      expect(badMember.status).toBe(400);
    });

    it('should update every member and email account holders their new rating', async () => {
      await createAdmin(ADMIN);
      const holder = await createMember({ number: 5, account: memberAccount() });
      const other = await createMember({ firstName: 'Olga', email: '' });

      const response = await request(app)
        .put('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send([
          { ...memberFields({ rating: '1550' }), id: holder._id.toString() },
          {
            ...memberFields({ firstName: 'Olga', email: '', rating: '1300' }),
            id: other._id.toString(),
          },
        ]);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        updatedIds: [holder._id.toString(), other._id.toString()],
        unnotifiedMemberNames: [],
      });
      expect((await readMember(other._id)).rating).toBe('1300');
      expect(sendEmail).toHaveBeenCalledOnce();
      expect(sendEmail).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({ subject: 'Your London Chess rating has been updated' }),
      );
    });

    it('should report account holders who could not be emailed', async () => {
      await createAdmin(ADMIN);
      const holder = await createMember({ number: 5, account: memberAccount() });
      vi.mocked(sendEmail).mockRejectedValue(new Error('SMTP down'));

      const response = await request(app)
        .put('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send([{ ...memberFields({ rating: '1550' }), id: holder._id.toString() }]);

      expect(response.status).toBe(200);
      expect(response.body.data.unnotifiedMemberNames).toEqual(['Jane Doe']);
    });

    it('should only update account holders from the site', async () => {
      await createAdmin(ADMIN);
      const holder = await createMember({ number: 5, account: memberAccount() });

      const response = await request(app)
        .put('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .send([{ ...memberFields({ rating: '1550' }), id: holder._id.toString() }]);

      expect(response.status).toBe(400);
      expect((await readMember(holder._id)).rating).toBe('1500');
    });

    it('should save nothing when one of the members is missing', async () => {
      await createAdmin(ADMIN);
      const member = await createMember();
      const missing = new Types.ObjectId().toString();

      const response = await request(app)
        .put('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .send([
          { ...memberFields({ rating: '1550' }), id: member._id.toString() },
          { ...memberFields(), id: missing },
        ]);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain(missing);
      expect((await readMember(member._id)).rating).toBe('1500');
    });

    it('should respond with a server error when the transaction fails', async () => {
      await createAdmin(ADMIN);
      const member = await createMember();
      vi.spyOn(MemberModel, 'updateOne').mockRejectedValue(new Error('down'));

      const response = await request(app)
        .put('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .send([{ ...memberFields(), id: member._id.toString() }]);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Unable to update members: Error: down');
    });

    it('should respond with a server error when the database fails before saving', async () => {
      await createAdmin(ADMIN);
      vi.spyOn(MemberModel, 'startSession').mockRejectedValue(new Error('down'));

      const response = await request(app)
        .put('/v1/admin/members')
        .set('Authorization', bearer(ADMIN))
        .send([{ ...memberFields(), id: new Types.ObjectId().toString() }]);

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /v1/admin/members/:id', () => {
    it('should delete a member without an account', async () => {
      await createAdmin(ADMIN);
      const member = await createMember();

      const response = await request(app)
        .delete(`/v1/admin/members/${member._id}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(200);
      expect(await MemberModel.exists({ _id: member._id })).toBeNull();
    });

    it('should keep a member with an account', async () => {
      await createAdmin(ADMIN);
      const member = await createMember({ number: 5, account: memberAccount() });

      const response = await request(app)
        .delete(`/v1/admin/members/${member._id}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(409);
      expect(await MemberModel.exists({ _id: member._id })).not.toBeNull();
    });

    it('should respond with not found for an unknown or malformed id', async () => {
      await createAdmin(ADMIN);

      const unknown = await request(app)
        .delete(`/v1/admin/members/${new Types.ObjectId()}`)
        .set('Authorization', bearer(ADMIN));
      const malformed = await request(app)
        .delete('/v1/admin/members/not-an-id')
        .set('Authorization', bearer(ADMIN));

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      await createAdmin(ADMIN);
      const member = await createMember();
      vi.spyOn(MemberModel, 'deleteOne').mockRejectedValue(new Error('down'));

      const response = await request(app)
        .delete(`/v1/admin/members/${member._id}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(500);
    });
  });
});
