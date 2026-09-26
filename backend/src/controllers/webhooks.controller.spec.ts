import { Request } from 'express';
import request from 'supertest';

import { app } from '../app';
import { MemberModel } from '../models/member.model';
import { useTestDatabase } from '../testing/database';
import {
  createMember,
  memberAccount,
  readMember,
  startMemberNumbers,
} from '../testing/fixtures';
import { webhookHeaders } from '../testing/webhook';
import { ClerkUserEventData, toProfile, verifyClerkWebhook } from './webhooks.controller';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));
vi.mock('../services/storage.service', () => import('../testing/storage.mock.js'));

describe('toProfile', () => {
  const baseData: ClerkUserEventData = {
    id: 'user_123',
    first_name: 'John',
    last_name: 'Doe',
    email_addresses: [
      { id: 'idn_1', email_address: 'secondary@example.com' },
      { id: 'idn_2', email_address: 'primary@example.com' },
    ],
    primary_email_address_id: 'idn_2',
    image_url: 'https://img.clerk.com/photo',
    has_image: true,
    public_metadata: { isAdmin: true },
  };

  it('should map a Clerk user payload to a profile', () => {
    const profile = toProfile(baseData);

    expect(profile).toEqual({
      id: 'user_123',
      email: 'primary@example.com',
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: 'https://img.clerk.com/photo',
      hasImage: true,
      isAdmin: true,
      memberId: null,
    });
  });

  it('should carry the member id from the public metadata', () => {
    const data: ClerkUserEventData = {
      ...baseData,
      public_metadata: { memberId: '507f1f77bcf86cd799439011' },
    };

    const profile = toProfile(data);

    expect(profile.memberId).toBe('507f1f77bcf86cd799439011');
  });

  it('should ignore a member id that is not a string', () => {
    const profile = toProfile({ ...baseData, public_metadata: { memberId: 42 } });

    expect(profile.memberId).toBeNull();
  });

  it('should fall back to the first email address when the primary id does not match', () => {
    const data: ClerkUserEventData = { ...baseData, primary_email_address_id: 'idn_9' };

    const profile = toProfile(data);

    expect(profile.email).toBe('secondary@example.com');
  });

  it('should treat missing or non-true admin metadata as non-admin', () => {
    const withoutMetadata = toProfile({ ...baseData, public_metadata: undefined });
    const withFalse = toProfile({ ...baseData, public_metadata: { isAdmin: false } });
    const withString = toProfile({ ...baseData, public_metadata: { isAdmin: 'yes' } });

    expect(withoutMetadata.isAdmin).toBe(false);
    expect(withFalse.isAdmin).toBe(false);
    expect(withString.isAdmin).toBe(false);
  });

  it('should default missing fields to empty values', () => {
    const profile = toProfile({ id: 'user_456' });

    expect(profile).toEqual({
      id: 'user_456',
      email: '',
      firstName: '',
      lastName: '',
      imageUrl: '',
      hasImage: false,
      isAdmin: false,
      memberId: null,
    });
  });
});

describe('verifyClerkWebhook', () => {
  const body = JSON.stringify({ type: 'user.created', data: { id: 'user_123' } });

  function signedRequest(
    payload: string,
    signedPayload = payload,
  ): Pick<Request, 'headers' | 'originalUrl' | 'body'> {
    return {
      headers: webhookHeaders(signedPayload),
      originalUrl: '/v1/webhooks/clerk',
      body: Buffer.from(payload),
    };
  }

  it('should return the event for a correctly signed request', async () => {
    const request = signedRequest(body);

    const event = await verifyClerkWebhook(request);

    expect(event?.type).toBe('user.created');
    expect(event?.data).toEqual({ id: 'user_123' });
  });

  it('should reject a request whose body changed after it was signed', async () => {
    const request = signedRequest(body.replace('user_123', 'user_999'), body);

    const event = await verifyClerkWebhook(request);

    expect(event).toBeNull();
  });

  it('should reject a request without signature headers', async () => {
    const request = {
      ...signedRequest(body),
      headers: { 'content-type': 'application/json' },
    };

    const event = await verifyClerkWebhook(request);

    expect(event).toBeNull();
  });
});

describe('POST /v1/webhooks/clerk', () => {
  useTestDatabase();

  function deliver(event: object) {
    const payload = JSON.stringify(event);
    return request(app)
      .post('/v1/webhooks/clerk')
      .set(webhookHeaders(payload))
      .send(payload);
  }

  it('should link a new user to the member named in their metadata', async () => {
    await startMemberNumbers(9);
    const member = await createMember();

    const response = await deliver({
      type: 'user.created',
      data: { id: 'user_new', public_metadata: { memberId: member._id.toString() } },
    });

    expect(response.status).toBe(200);
    const linked = await readMember(member._id);
    expect(linked.account?.clerkUserId).toBe('user_new');
    expect(linked.number).toBe(9);
  });

  it('should sync an updated user onto their member record', async () => {
    const member = await createMember({ number: 3, account: memberAccount() });

    const response = await deliver({
      type: 'user.updated',
      data: {
        id: 'user_test',
        email_addresses: [{ id: 'idn_1', email_address: 'new@example.com' }],
        public_metadata: { isAdmin: true },
      },
    });

    expect(response.status).toBe(200);
    const synced = await readMember(member._id);
    expect(synced.email).toBe('new@example.com');
    expect(synced.account?.isAdmin).toBe(true);
  });

  it('should take the account off a deleted user and ignore other events', async () => {
    const member = await createMember({ number: 3, account: memberAccount() });

    const deleted = await deliver({ type: 'user.deleted', data: { id: 'user_test' } });
    const other = await deliver({ type: 'session.created', data: { id: 'sess_1' } });

    expect(deleted.status).toBe(200);
    expect(other.status).toBe(200);
    expect((await readMember(member._id)).account).toBeNull();
  });

  it('should reject an unsigned delivery', async () => {
    const response = await request(app)
      .post('/v1/webhooks/clerk')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ type: 'user.deleted', data: { id: 'user_test' } }));

    expect(response.status).toBe(400);
  });

  it('should respond with a server error when the event cannot be processed', async () => {
    vi.spyOn(MemberModel, 'findOne').mockImplementation(() => {
      throw new Error('down');
    });

    const response = await deliver({ type: 'user.updated', data: { id: 'user_test' } });

    expect(response.status).toBe(500);
  });
});
