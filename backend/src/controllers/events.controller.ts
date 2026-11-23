import { Request, Response } from 'express';

import { limitCdnCache } from '../middlewares/cdn-cache.middleware';
import { ApiPaginatedResponse, ApiResponse } from '../models/api-response.model';
import { Id } from '../models/core.model';
import { Event, EventModel, eventSortingConfig, eventTypes } from '../models/event.model';
import { MemberModel, MemberRecord, UnnotifiedMember } from '../models/member.model';
import { ModificationInfo } from '../models/modification-info.model';
import { sendEmails } from '../services/email.service';
import { findEditor } from '../services/member-accounts.service';
import { widestEventIds } from '../services/widest.service';
import { buildScheduleChangesEmail } from '../util/emails.util';
import { isCollectionId } from '../util/is-collection-id.util';
import { creditEditor } from '../util/modification-info.util';
import {
  buildPaginationQuery,
  findPage,
  parsePaginationParams,
} from '../util/pagination.util';
import { ScheduleChange, describeScheduleChange } from '../util/schedule-changes.util';
import { EMAILS_FROM_SITE_ONLY, siteUrlFor } from '../util/site-url.util';
import { unnotifiedMembers } from '../util/unnotified-members.util';
import { validateObjectByTypes } from '../util/validate-object-by-types.util';

interface ScheduleSaveResult {
  id: Id;
  unnotifiedMembers: UnnotifiedMember[];
}

interface ScheduleChangesInput {
  added: Event[];
  updated: Event[];
  removed: Id[];
}

interface ScheduleChangesResult {
  addedIds: Id[];
  unnotifiedMembers: UnnotifiedMember[];
}

interface ScheduleNotice {
  changes: ScheduleChange[];
  recipients: MemberRecord[];
  siteUrl: string;
}

type ScheduledEvent = Pick<Event, 'eventDate' | 'title' | 'type'>;

// An event as it was and as it is to be, null for one being added or removed
type ScheduleEdit = [before: ScheduledEvent | null, after: ScheduledEvent | null];

export async function getEvents(
  req: Request,
  res: Response<ApiPaginatedResponse<Event>>,
): Promise<void> {
  try {
    const params = parsePaginationParams(req);
    const query = buildPaginationQuery<Event>(params, eventSortingConfig);

    const [{ records, filteredCount, totalCount }, nextEvent] = await Promise.all([
      findPage(EventModel, query),
      'eventDate' in params.filters
        ? EventModel.findOne(query.filter, { eventDate: 1 }).sort({ eventDate: 1 }).lean()
        : null,
    ]);
    const events: Event[] = records.map(({ _id, ...event }) => ({
      ...event,
      id: _id.toString(),
    }));

    // An upcoming event leaves the list as it starts, so the stored list lasts until then
    if (nextEvent) {
      limitCdnCache(res, (Date.parse(nextEvent.eventDate) - Date.now()) / 1000);
    }

    res.status(200).json({
      data: {
        items: events,
        filteredCount,
        totalCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

// The events holding the widest text of each column, for sizing the table before a page loads
export async function getWidestEvents(
  _req: Request,
  res: Response<ApiResponse<Event[]>>,
): Promise<void> {
  try {
    const records = await EventModel.find({
      _id: { $in: await widestEventIds() },
    }).lean();
    res.status(200).json({
      data: records.map(({ _id, ...event }) => ({ ...event, id: _id.toString() })),
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function getEvent(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<Event>>,
): Promise<void> {
  try {
    const { id } = req.params;
    const findResult = isCollectionId(id) ? await EventModel.findById(id).lean() : null;

    if (!findResult) {
      res.status(404).json({
        message: `Unable to find event [${id}]`,
      });
      return;
    }

    const { _id, ...baseEvent } = findResult;
    const event = { ...baseEvent, id };

    res.status(200).json({ data: event });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function addEvent(
  req: Request,
  res: Response<ApiResponse<ScheduleSaveResult>>,
): Promise<void> {
  try {
    const eventValidationResult = validateObjectByTypes(req.body, eventTypes);
    if (eventValidationResult !== 'valid') {
      res
        .status(400)
        .json({ message: `Invalid event: ${eventValidationResult.message}` });
      return;
    }

    const notice = await scheduleNotice(req, [[null, req.body]]);
    if (notice === 'no-site') {
      res.status(400).json({ message: EMAILS_FROM_SITE_ONLY });
      return;
    }

    const preparedEvent = prepareEventForDB(
      req.body,
      creditEditor(await findEditor(req.user.id), null),
    );
    const result = await EventModel.create(preparedEvent);

    res.status(201).json({
      data: {
        id: result._id.toString(),
        unnotifiedMembers: await notifyScheduleChanges(notice),
      },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function updateEvent(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<ScheduleSaveResult>>,
): Promise<void> {
  try {
    const { id } = req.params;

    const eventValidationResult = validateObjectByTypes(req.body, eventTypes);
    if (eventValidationResult !== 'valid') {
      res
        .status(400)
        .json({ message: `Invalid event: ${eventValidationResult.message}` });
      return;
    }

    const stored = isCollectionId(id) ? await EventModel.findById(id).lean() : null;
    const notice = stored ? await scheduleNotice(req, [[stored, req.body]]) : null;
    if (notice === 'no-site') {
      res.status(400).json({ message: EMAILS_FROM_SITE_ONLY });
      return;
    }

    const result = stored
      ? await EventModel.updateOne(
          { _id: id },
          {
            $set: prepareEventForDB(
              req.body,
              creditEditor(await findEditor(req.user.id), stored.modificationInfo),
            ),
          },
        )
      : null;

    if (!result?.matchedCount) {
      res.status(404).json({
        message: `Unable to update event [${id}] because it could not be found.`,
      });
      return;
    }

    res.status(200).json({
      data: { id, unnotifiedMembers: await notifyScheduleChanges(notice) },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function deleteEvent(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<ScheduleSaveResult>>,
): Promise<void> {
  try {
    const { id } = req.params;

    const stored = isCollectionId(id) ? await EventModel.findById(id).lean() : null;
    const notice = stored ? await scheduleNotice(req, [[stored, null]]) : null;
    if (notice === 'no-site') {
      res.status(400).json({ message: EMAILS_FROM_SITE_ONLY });
      return;
    }

    const result = stored ? await EventModel.deleteOne({ _id: id }) : null;

    if (!result?.deletedCount) {
      res.status(404).json({
        message: `Unable to delete event [${id}] because it could not be found.`,
      });
      return;
    }

    res.status(200).json({
      data: { id, unnotifiedMembers: await notifyScheduleChanges(notice) },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

/**
 * Adds, updates and removes events together, all or none of them, and emails each member
 * who wants to hear about the schedule once about every change.
 */
export async function changeEvents(
  req: Request,
  res: Response<ApiResponse<ScheduleChangesResult>>,
): Promise<void> {
  try {
    const input = scheduleChangesInput(req.body);
    if (typeof input === 'string') {
      res.status(400).json({ message: `Invalid schedule changes: ${input}.` });
      return;
    }

    const ids = [...input.updated.map(({ id }) => id), ...input.removed];
    const stored = new Map(
      (await EventModel.find({ _id: { $in: ids } }).lean()).map(record => [
        record._id.toString(),
        record,
      ]),
    );
    const missingId = ids.find(id => !stored.has(id));
    if (missingId) {
      res.status(404).json({
        message: `Unable to change the schedule because event [${missingId}] could not be found.`,
      });
      return;
    }

    const notice = await scheduleNotice(req, [
      ...input.added.map((event): ScheduleEdit => [null, event]),
      ...input.updated.map((event): ScheduleEdit => [
        stored.get(event.id) ?? null,
        event,
      ]),
      ...input.removed.map((id): ScheduleEdit => [stored.get(id) ?? null, null]),
    ]);
    if (notice === 'no-site') {
      res.status(400).json({ message: EMAILS_FROM_SITE_ONLY });
      return;
    }

    const editor = await findEditor(req.user.id);
    let addedIds: Id[] = [];
    const session = await EventModel.startSession();
    try {
      await session.withTransaction(async () => {
        const created = await EventModel.insertMany(
          input.added.map(event => prepareEventForDB(event, creditEditor(editor, null))),
          { session },
        );
        addedIds = created.map(({ _id }) => _id.toString());
        if (input.updated.length) {
          await EventModel.bulkWrite(
            input.updated.map(event => ({
              updateOne: {
                filter: { _id: event.id },
                update: {
                  $set: prepareEventForDB(
                    event,
                    creditEditor(editor, stored.get(event.id)?.modificationInfo ?? null),
                  ),
                },
              },
            })),
            { session },
          );
        }
        if (input.removed.length) {
          await EventModel.deleteMany({ _id: { $in: input.removed } }, { session });
        }
      });
    } finally {
      await session.endSession();
    }

    res.status(200).json({
      data: { addedIds, unnotifiedMembers: await notifyScheduleChanges(notice) },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

// The first reason the body is not a set of changes to the schedule, or the changes
function scheduleChangesInput(body: unknown): ScheduleChangesInput | string {
  if (typeof body !== 'object' || body === null) {
    return 'not an object';
  }
  const added: unknown = 'added' in body ? body.added : undefined;
  const updated: unknown = 'updated' in body ? body.updated : undefined;
  const removed: unknown = 'removed' in body ? body.removed : undefined;
  if (!Array.isArray(added) || !Array.isArray(updated) || !Array.isArray(removed)) {
    return 'added, updated and removed must each be a list';
  }
  if (!added.length && !updated.length && !removed.length) {
    return 'there are no changes';
  }
  for (const event of [...added, ...updated]) {
    const result = validateObjectByTypes<Event>(event, eventTypes);
    if (result !== 'valid') {
      return withoutFullStop(result.message);
    }
  }
  const ids: unknown[] = [...updated.map(({ id }) => id), ...removed];
  if (!ids.every(isCollectionId)) {
    return 'every updated or removed event needs a valid id';
  }
  if (new Set(ids).size !== ids.length) {
    return 'an event can only be changed once';
  }
  return { added, updated, removed };
}

function withoutFullStop(message: string): string {
  return message.replace(/\.$/, '');
}

// Remove id property and order remaining properties alphabetically
function prepareEventForDB(
  event: Event,
  modificationInfo: ModificationInfo,
): Omit<Event, 'id'> {
  return {
    articleId: event.articleId,
    details: event.details,
    eventDate: event.eventDate,
    modificationInfo,
    title: event.title,
    type: event.type,
  };
}

const eventDateOf = ([before, after]: ScheduleEdit): string =>
  after?.eventDate ?? before?.eventDate ?? '';

// Everyone with an account and an email address who wants to hear about the schedule, but
// the admin making the changes, told about them in date order; a record saved before the
// preference existed has no value for it, which is a yes
async function scheduleNotice(
  req: Request,
  edits: ScheduleEdit[],
): Promise<ScheduleNotice | 'no-site' | null> {
  const changes = [...edits]
    .sort((a, b) => eventDateOf(a).localeCompare(eventDateOf(b)))
    .flatMap(([before, after]) => describeScheduleChange(before, after) ?? []);
  if (!changes.length) {
    return null;
  }
  const recipients = await MemberModel.find({
    'account.clerkUserId': { $nin: [null, req.user.id] },
    'preferences.notifyScheduleChanges': { $ne: false },
    email: { $nin: ['', null] },
  }).lean<MemberRecord[]>();
  if (!recipients.length) {
    return null;
  }
  const siteUrl = siteUrlFor(req);
  return siteUrl ? { changes, recipients, siteUrl } : 'no-site';
}

async function notifyScheduleChanges(
  notice: ScheduleNotice | null,
): Promise<UnnotifiedMember[]> {
  if (!notice) {
    return [];
  }
  const { changes, recipients, siteUrl } = notice;
  const sent = await sendEmails(
    recipients.map(record => ({
      to: record.email,
      content: buildScheduleChangesEmail(
        record,
        changes,
        `${siteUrl}/schedule`,
        `${siteUrl}/account/preferences`,
      ),
    })),
    'schedule change',
  );
  return unnotifiedMembers(recipients, sent);
}
