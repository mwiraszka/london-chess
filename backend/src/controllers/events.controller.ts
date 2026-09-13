import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { ApiPaginatedResponse, ApiResponse } from '../models/api-response.model';
import { Id } from '../models/core.model';
import { Event, EventModel, eventSortingConfig, eventTypes } from '../models/event.model';
import { modificationInfoTypes } from '../models/modification-info.model';
import { isCollectionId } from '../util/is-collection-id.util';
import { buildPaginationQuery, parsePaginationParams } from '../util/pagination.util';
import { validateObjectByTypes } from '../util/validate-object-by-types.util';

export async function getEvents(
  req: Request,
  res: Response<ApiPaginatedResponse<Event>>,
): Promise<void> {
  try {
    const query = buildPaginationQuery<Event>(
      parsePaginationParams(req),
      eventSortingConfig,
    );

    const [queryResults, countResults] = await Promise.all([
      query.limit !== undefined
        ? EventModel.find(query.filter)
            .sort(query.sort)
            .skip(query.skip)
            .limit(query.limit)
            .lean()
        : EventModel.find(query.filter).sort(query.sort).skip(query.skip).lean(),
      EventModel.countDocuments(query.filter),
    ]);

    const findResults = queryResults;
    const filteredCount = countResults;

    const totalCount = await EventModel.countDocuments({});

    const events: Event[] = findResults.map(result => {
      const { _id, ...baseEvent } = result;
      return {
        ...baseEvent,
        id: result._id.toString(),
      };
    });

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
  res: Response<ApiResponse<Id>>,
): Promise<void> {
  try {
    const eventValidationResult = validateObjectByTypes(req.body, eventTypes);
    if (eventValidationResult !== 'valid') {
      res
        .status(400)
        .json({ message: `Invalid event: ${eventValidationResult.message}` });
      return;
    }

    const modInfoValidationResult = validateObjectByTypes(
      (req.body as Event).modificationInfo,
      modificationInfoTypes,
    );
    if (modInfoValidationResult !== 'valid') {
      res.status(400).json({
        message: `Invalid event modification info: ${modInfoValidationResult.message}`,
      });
      return;
    }

    const preparedEvent = prepareEventForDB(req.body);
    const result = await EventModel.create(preparedEvent);

    res.status(201).json({ data: result._id.toString() });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function updateEvent(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<Id>>,
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

    const modInfoValidationResult = validateObjectByTypes(
      (req.body as Event).modificationInfo,
      modificationInfoTypes,
    );
    if (modInfoValidationResult !== 'valid') {
      res.status(400).json({
        message: `Invalid event modification info: ${modInfoValidationResult.message}`,
      });
      return;
    }

    const preparedEvent = prepareEventForDB(req.body);
    const result = await EventModel.updateOne(
      { _id: new ObjectId(id) },
      { $set: preparedEvent },
    );

    if (result.matchedCount === 0 || result.modifiedCount === 0) {
      res.status(404).json({
        data: `Unable to update event [${id}] - event not found`,
      });
      return;
    }

    res.status(200).json({ data: id });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function deleteEvent(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<Id>>,
): Promise<void> {
  try {
    const { id } = req.params;

    const result = await EventModel.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      res.status(404).json({
        message: `Unable to delete event [${id}] - event not found`,
      });
      return;
    }

    res.status(200).json({ data: id });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

// Remove id property and order remaining properties alphabetically
function prepareEventForDB(event: Event): Omit<Event, 'id'> {
  return {
    articleId: event.articleId,
    details: event.details,
    eventDate: event.eventDate,
    modificationInfo: {
      createdBy: event.modificationInfo.createdBy,
      dateCreated: event.modificationInfo.dateCreated,
      dateLastEdited: event.modificationInfo.dateLastEdited,
      lastEditedBy: event.modificationInfo.lastEditedBy,
    },
    title: event.title,
    type: event.type,
  };
}
