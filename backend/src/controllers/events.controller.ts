import { Request, Response } from 'express';

import { ApiPaginatedResponse, ApiResponse } from '../models/api-response.model';
import { Id } from '../models/core.model';
import { Event, EventModel, eventSortingConfig, eventTypes } from '../models/event.model';
import { MemberModel, MemberRecord } from '../models/member.model';
import { ModificationInfo } from '../models/modification-info.model';
import { sendEmail } from '../services/email.service';
import { findEditor } from '../services/member-accounts.service';
import { widestEventIds } from '../services/widest.service';
import { buildScheduleChangeEmail } from '../util/emails.util';
import { isCollectionId } from '../util/is-collection-id.util';
import { creditEditor } from '../util/modification-info.util';
import {
  buildPaginationQuery,
  findPage,
  parsePaginationParams,
} from '../util/pagination.util';
import { ScheduleChange, describeScheduleChange } from '../util/schedule-changes.util';
import { EMAILS_FROM_SITE_ONLY, siteUrlFor } from '../util/site-url.util';
import { validateObjectByTypes } from '../util/validate-object-by-types.util';

interface ScheduleSaveResult {
  id: Id;
  unnotifiedMemberNames: string[];
}

interface ScheduleNotice {
  change: ScheduleChange;
  recipients: MemberRecord[];
  siteUrl: string;
}

export async function getEvents(
  req: Request,
  res: Response<ApiPaginatedResponse<Event>>,
): Promise<void> {
  try {
    const query = buildPaginationQuery<Event>(
      parsePaginationParams(req),
      eventSortingConfig,
    );

    const { records, filteredCount, totalCount } = await findPage(EventModel, query);
    const events: Event[] = records.map(({ _id, ...event }) => ({
      ...event,
      id: _id.toString(),
    }));

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

    const notice = await scheduleNotice(req, null, req.body);
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
        unnotifiedMemberNames: await notifyScheduleChange(notice),
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
    const notice = stored ? await scheduleNotice(req, stored, req.body) : null;
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
      data: { id, unnotifiedMemberNames: await notifyScheduleChange(notice) },
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
    const notice = stored ? await scheduleNotice(req, stored, null) : null;
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
      data: { id, unnotifiedMemberNames: await notifyScheduleChange(notice) },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
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

// Everyone with an account who wants to hear about the schedule, but the admin making
// the change; a record saved before the preference existed has no value for it, which
// is a yes
async function scheduleNotice(
  req: Request,
  before: Pick<Event, 'eventDate' | 'title' | 'type'> | null,
  after: Pick<Event, 'eventDate' | 'title' | 'type'> | null,
): Promise<ScheduleNotice | 'no-site' | null> {
  const change = describeScheduleChange(before, after);
  if (!change) {
    return null;
  }
  const recipients = await MemberModel.find({
    'account.clerkUserId': { $nin: [null, req.user.id] },
    'preferences.notifyScheduleChanges': { $ne: false },
  }).lean<MemberRecord[]>();
  if (!recipients.length) {
    return null;
  }
  const siteUrl = siteUrlFor(req);
  return siteUrl ? { change, recipients, siteUrl } : 'no-site';
}

async function notifyScheduleChange(notice: ScheduleNotice | null): Promise<string[]> {
  if (!notice) {
    return [];
  }
  const { change, recipients, siteUrl } = notice;
  const results = await Promise.allSettled(
    recipients.map(record =>
      sendEmail(
        record.email,
        buildScheduleChangeEmail(
          record,
          change,
          `${siteUrl}/schedule`,
          `${siteUrl}/account/preferences`,
        ),
      ),
    ),
  );
  return recipients
    .filter((_, index) => results[index].status === 'rejected')
    .map(({ firstName, lastName }) => `${firstName} ${lastName}`);
}
