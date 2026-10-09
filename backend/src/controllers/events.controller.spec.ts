import { Types } from 'mongoose';
import request from 'supertest';

import { app } from '../app';
import { Event, EventModel } from '../models/event.model';
import { sendEmail } from '../services/email.service';
import { bearer } from '../testing/clerk.mock';
import { useTestDatabase } from '../testing/database';
import {
  MODIFICATION_INFO,
  createAdmin,
  createMember,
  memberAccount,
} from '../testing/fixtures';
import { EMAILS_FROM_SITE_ONLY } from '../util/site-url.util';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));
vi.mock('../services/email.service', () => ({
  sendEmail: vi.fn(),
  sendAdminEmail: vi.fn(),
}));

const ADMIN = 'user_admin';
const SITE = 'https://londonchess.ca';

function eventPayload(overrides: Partial<Event> = {}): Event {
  return {
    id: '',
    eventDate: '2026-10-01T23:00:00.000Z',
    title: 'Blitz night',
    details: 'Five minute games',
    type: 'blitz',
    articleId: '',
    modificationInfo: MODIFICATION_INFO,
    ...overrides,
  };
}

async function createEvent(overrides: Partial<Event> = {}): Promise<string> {
  const { id, ...event } = eventPayload(overrides);
  const created = await EventModel.create(event);
  return created._id.toString();
}

describe('events routes', () => {
  useTestDatabase();

  describe('GET /v1/events', () => {
    it('should leave out past events when asked', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-26T12:00:00.000Z'));
      await createEvent({ title: 'Past', eventDate: '2026-09-01T23:00:00.000Z' });
      await createEvent({ title: 'Upcoming', eventDate: '2026-10-01T23:00:00.000Z' });

      const response = await request(app).get('/v1/events?filter_showPastEvents=false');

      expect(response.status).toBe(200);
      expect(response.body.data.items.map((item: Event) => item.title)).toEqual([
        'Upcoming',
      ]);
      expect(response.body.data.filteredCount).toBe(1);
      expect(response.body.data.totalCount).toBe(2);
    });

    it('should page through events', async () => {
      await createEvent({ title: 'First', eventDate: '2026-10-01T23:00:00.000Z' });
      await createEvent({ title: 'Second', eventDate: '2026-10-08T23:00:00.000Z' });

      const response = await request(app).get(
        '/v1/events?page=1&pageSize=1&sortBy=eventDate&sortOrder=desc',
      );

      expect(response.body.data.items.map((item: Event) => item.title)).toEqual([
        'Second',
      ]);
      expect(response.body.data.filteredCount).toBe(2);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(EventModel, 'countDocuments').mockRejectedValue(new Error('down'));

      const response = await request(app).get('/v1/events');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/events/widest', () => {
    it('should return the events holding the widest text of each column', async () => {
      await createEvent({ title: 'A much longer event title than the rest' });
      await createEvent({ details: 'Short', type: 'lecture' });
      await createEvent({ eventDate: '2026-12-03T23:00:00.000Z' });

      const response = await request(app).get('/v1/events/widest');

      expect(response.status).toBe(200);
      const events: Event[] = response.body.data;
      expect(events.map(event => event.title)).toContain(
        'A much longer event title than the rest',
      );
      expect(events.map(event => event.type).sort()).toEqual(
        expect.arrayContaining(['blitz', 'lecture']),
      );
      expect(events.map(event => event.eventDate.slice(5, 7))).toEqual(
        expect.arrayContaining(['10', '12']),
      );
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(EventModel, 'aggregate').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get('/v1/events/widest');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/events/:id', () => {
    it('should return the event', async () => {
      const id = await createEvent();

      const response = await request(app).get(`/v1/events/${id}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ id, title: 'Blitz night' });
    });

    it('should respond with not found for an unknown or malformed id', async () => {
      const unknown = await request(app).get(`/v1/events/${new Types.ObjectId()}`);
      const malformed = await request(app).get('/v1/events/not-an-id');

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(EventModel, 'findById').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get(`/v1/events/${new Types.ObjectId()}`);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /v1/events', () => {
    it('should save the event credited to the signed-in admin, made now', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-05T12:00:00.000Z'));
      await createAdmin(ADMIN);

      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', bearer(ADMIN))
        .send(eventPayload());

      expect(response.status).toBe(201);
      const saved = await EventModel.findById(response.body.data.id).lean();
      expect(saved?.title).toBe('Blitz night');
      expect(saved?.modificationInfo).toMatchObject({
        createdBy: 'Ada Admin',
        dateCreated: '2026-10-05T12:00:00.000Z',
        dateLastEdited: '2026-10-05T12:00:00.000Z',
      });
    });

    it('should reject an invalid event', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', bearer(ADMIN))
        .send({ ...eventPayload(), title: 5 });

      expect(response.status).toBe(400);
      expect(await EventModel.countDocuments()).toBe(0);
    });

    it('should respond with a server error when the event cannot be saved', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', bearer(ADMIN))
        .send(eventPayload({ title: '' }));

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /v1/events/:id', () => {
    it('should update the event, keeping who made it whatever the request says', async () => {
      await createAdmin(ADMIN);
      const id = await createEvent();

      const response = await request(app)
        .put(`/v1/events/${id}`)
        .set('Authorization', bearer(ADMIN))
        .send(
          eventPayload({
            id,
            title: 'Rapid night',
            modificationInfo: { ...MODIFICATION_INFO, createdBy: 'Forged' },
          }),
        );

      expect(response.status).toBe(200);
      const saved = await EventModel.findById(id).lean();
      expect(saved?.title).toBe('Rapid night');
      expect(saved?.modificationInfo).toMatchObject({
        createdBy: MODIFICATION_INFO.createdBy,
        lastEditedBy: 'Ada Admin',
      });
    });

    it('should accept a save that changes nothing', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-26T12:00:00.000Z'));
      await createAdmin(ADMIN);
      const id = await createEvent();
      const save = () =>
        request(app)
          .put(`/v1/events/${id}`)
          .set('Authorization', bearer(ADMIN))
          .send(eventPayload({ id }));
      await save();

      const response = await save();

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ id, unnotifiedMemberNames: [] });
    });

    it('should respond with not found for an unknown event', async () => {
      await createAdmin(ADMIN);
      const id = new Types.ObjectId().toString();

      const response = await request(app)
        .put(`/v1/events/${id}`)
        .set('Authorization', bearer(ADMIN))
        .send(eventPayload({ id }));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `Unable to update event [${id}] because it could not be found.`,
      });
    });

    it('should reject an invalid event', async () => {
      await createAdmin(ADMIN);
      const id = await createEvent();

      const response = await request(app)
        .put(`/v1/events/${id}`)
        .set('Authorization', bearer(ADMIN))
        .send({ type: false });

      expect(response.status).toBe(400);
    });

    it('should respond with not found for a malformed id', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .put('/v1/events/not-an-id')
        .set('Authorization', bearer(ADMIN))
        .send(eventPayload());

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /v1/events/:id', () => {
    it('should delete the event', async () => {
      await createAdmin(ADMIN);
      const id = await createEvent();

      const response = await request(app)
        .delete(`/v1/events/${id}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(200);
      expect(await EventModel.countDocuments()).toBe(0);
    });

    it('should respond with not found for an unknown event', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .delete(`/v1/events/${new Types.ObjectId()}`)
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(404);
    });

    it('should respond with not found for a malformed id', async () => {
      await createAdmin(ADMIN);

      const response = await request(app)
        .delete('/v1/events/not-an-id')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(404);
    });
  });

  describe('schedule emails', () => {
    const NO_SCHEDULE_EMAILS = {
      showYearOfBirth: false,
      brand: 'modern' as const,
      notifyRatingChanges: true,
      notifyScheduleChanges: false,
    };

    beforeEach(async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-26T12:00:00.000Z'));
      await createAdmin(ADMIN);
      await createMember({ number: 7, account: memberAccount() });
      await createMember({
        number: 8,
        firstName: 'Olga',
        email: 'olga@example.com',
        account: memberAccount({ clerkUserId: 'user_olga' }),
        preferences: NO_SCHEDULE_EMAILS,
      });
      await createMember({ firstName: 'Nina', email: 'nina@example.com' });
    });

    it('should email account holders who want them about a new upcoming event', async () => {
      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(eventPayload());

      expect(response.status).toBe(201);
      expect(response.body.data.unnotifiedMemberNames).toEqual([]);
      expect(sendEmail).toHaveBeenCalledOnce();
      expect(sendEmail).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({
          subject: 'New on the London Chess schedule: Blitz night',
          text: expect.stringContaining(`${SITE}/schedule`),
        }),
      );
    });

    it('should not email about an event that has already happened', async () => {
      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(eventPayload({ eventDate: '2026-09-01T23:00:00.000Z' }));

      expect(response.status).toBe(201);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should email a change to an event's title, but not to its details", async () => {
      const id = await createEvent();
      const save = (overrides: Partial<Event>) =>
        request(app)
          .put(`/v1/events/${id}`)
          .set('Authorization', bearer(ADMIN))
          .set('Origin', SITE)
          .send(eventPayload({ id, ...overrides }));

      await save({ details: 'Three minute games' });
      const emailsAfterDetails = vi.mocked(sendEmail).mock.calls.length;
      const response = await save({
        details: 'Three minute games',
        title: 'Bullet night',
      });

      expect(response.status).toBe(200);
      expect(emailsAfterDetails).toBe(0);
      expect(sendEmail).toHaveBeenCalledOnce();
      const [, email] = vi.mocked(sendEmail).mock.calls[0];
      expect(email.subject).toBe('London Chess schedule change: Bullet night');
      expect(email.text).toContain('Blitz night');
    });

    it('should email the removal of an upcoming event', async () => {
      const id = await createEvent();

      const response = await request(app)
        .delete(`/v1/events/${id}`)
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE);

      expect(response.status).toBe(200);
      expect(sendEmail).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({
          subject: 'Removed from the London Chess schedule: Blitz night',
        }),
      );
    });

    it('should only save a change members would be emailed about from the site', async () => {
      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', bearer(ADMIN))
        .send(eventPayload());

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(EMAILS_FROM_SITE_ONLY);
      expect(await EventModel.countDocuments()).toBe(0);
    });

    it('should report members who could not be emailed', async () => {
      vi.mocked(sendEmail).mockRejectedValue(new Error('SMTP down'));

      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', bearer(ADMIN))
        .set('Origin', SITE)
        .send(eventPayload());

      expect(response.status).toBe(201);
      expect(response.body.data.unnotifiedMemberNames).toEqual(['Jane Doe']);
      expect(await EventModel.countDocuments()).toBe(1);
    });
  });
});
