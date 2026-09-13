import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { ApiPaginatedResponse, ApiResponse } from '../models/api-response.model';
import { Id } from '../models/core.model';
import {
  Member,
  MemberModel,
  memberSortingConfig,
  memberTypes,
} from '../models/member.model';
import { modificationInfoTypes } from '../models/modification-info.model';
import { UserModel } from '../models/user.model';
import { buildPaginationQuery, parsePaginationParams } from '../util/pagination.util';
import { validateObjectByTypes } from '../util/validate-object-by-types.util';

// The admin badge on member profiles comes from matching members to admin
// users by email, the only field the two collections share
async function findAdminMemberIds(): Promise<Set<string>> {
  const adminUsers = await UserModel.find({ isAdmin: true }, { email: 1 }).lean();
  const emails = adminUsers.map(user => user.email).filter(Boolean);
  if (!emails.length) {
    return new Set();
  }

  const adminMembers = await MemberModel.find(
    { email: { $in: emails } },
    { _id: 1 },
  ).lean();
  return new Set(adminMembers.map(member => member._id.toString()));
}

export function getMembers(scope: 'public' | 'admin') {
  return async (
    req: Request,
    res: Response<ApiPaginatedResponse<Member>>,
  ): Promise<void> => {
    try {
      const query = buildPaginationQuery<Member>(
        parsePaginationParams(req),
        memberSortingConfig,
      );

      const projection =
        scope === 'public'
          ? {
              dateJoined: 0,
              email: 0,
              phoneNumber: 0,
              yearOfBirth: 0,
            }
          : {};

      // Check if we're sorting by rating or peakRating - use aggregation for proper numeric sorting
      const sortField = Object.keys(query.sort)[0];
      const isRatingSort = ['rating', 'peakRating'].includes(sortField);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let findResults: any[];
      let filteredCount: number;

      if (isRatingSort) {
        // Use aggregation pipeline for rating sorting
        const sortOrder = query.sort[sortField];
        const pipeline = [
          { $match: query.filter },
          {
            $addFields: {
              [`${sortField}Numeric`]: {
                $let: {
                  vars: {
                    parts: { $split: [`$${sortField}`, '/'] },
                  },
                  in: {
                    $add: [
                      // Base rating as a number
                      { $toDouble: { $arrayElemAt: ['$$parts', 0] } },
                      // Add offset based on whether it's provisional and game count
                      {
                        $cond: {
                          if: { $eq: [{ $size: '$$parts' }, 1] },
                          // Non-provisional: add 0.1 to make it higher than any provisional
                          // e.g. "1800" -> 1800 + 0.1 = 1800.1
                          then: 0.1,
                          // Provisional: add gameCount/1000 (max 999 games = +0.999)
                          // e.g. "1800/12" -> 1800 + 0.012 = 1800.012
                          else: {
                            $divide: [
                              { $toDouble: { $arrayElemAt: ['$$parts', 1] } },
                              1000,
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          { $sort: { [`${sortField}Numeric`]: sortOrder } },
          { $project: { ...projection, [`${sortField}Numeric`]: 0 } },
          { $skip: query.skip },
        ];

        if (query.limit !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pipeline.push({ $limit: query.limit } as any);
        }

        const [aggregationResults, countResults] = await Promise.all([
          MemberModel.aggregate(pipeline),
          MemberModel.countDocuments(query.filter),
        ]);

        findResults = aggregationResults;
        filteredCount = countResults;
      } else {
        // Use regular find for non-rating fields
        const [queryResults, countResults] = await Promise.all([
          query.limit !== undefined
            ? MemberModel.find(query.filter, projection)
                .sort(query.sort)
                .skip(query.skip)
                .limit(query.limit)
                .lean()
            : MemberModel.find(query.filter, projection)
                .sort(query.sort)
                .skip(query.skip)
                .lean(),
          MemberModel.countDocuments(query.filter),
        ]);

        findResults = queryResults;
        filteredCount = countResults;
      }

      const totalCount = await MemberModel.countDocuments({});

      const adminMemberIds = await findAdminMemberIds();
      const members: Member[] = findResults.map(result => {
        const { _id, ...baseMember } = result;
        const id = result._id.toString();
        return {
          ...baseMember,
          id,
          isAdmin: adminMemberIds.has(id),
        };
      });

      res.status(200).json({
        data: {
          items: members,
          filteredCount,
          totalCount,
        },
      });
    } catch (error) {
      res.status(500).json({ message: `Unknown error: ${error}` });
    }
  };
}

export function getMember(scope: 'public' | 'admin') {
  return async (
    req: Request<{ id: Id }>,
    res: Response<ApiResponse<Member>>,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const projection =
        scope === 'public'
          ? { dateJoined: 0, email: 0, phoneNumber: 0, yearOfBirth: 0 }
          : {};
      const findResult = await MemberModel.findById(id, projection).lean();

      if (!findResult) {
        res.status(404).json({ message: `Unable to find member [${id}]` });
        return;
      }

      const adminMemberIds = await findAdminMemberIds();
      const { _id, ...baseMember } = findResult;
      const member: Member = { ...baseMember, id, isAdmin: adminMemberIds.has(id) };

      res.status(200).json({ data: member });
    } catch (error) {
      res.status(500).json({ message: `Unknown error: ${error}` });
    }
  };
}

export async function addMember(
  req: Request,
  res: Response<ApiResponse<Id>>,
): Promise<void> {
  try {
    const memberValidationResult = validateObjectByTypes(req.body, memberTypes);
    if (memberValidationResult !== 'valid') {
      res
        .status(400)
        .json({ message: `Invalid member: ${memberValidationResult.message}` });
      return;
    }

    const modInfoValidationResult = validateObjectByTypes(
      (req.body as Member).modificationInfo,
      modificationInfoTypes,
    );
    if (modInfoValidationResult !== 'valid') {
      res.status(400).json({
        message: `Invalid member modification info: ${modInfoValidationResult.message}`,
      });
      return;
    }

    const preparedMember = prepareMemberForDB(req.body);
    const result = await MemberModel.create(preparedMember);

    res.status(201).json({ data: result._id.toString() });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function updateMember(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<Id>>,
): Promise<void> {
  try {
    const { id } = req.params;

    const memberValidationResult = validateObjectByTypes(req.body, memberTypes);
    if (memberValidationResult !== 'valid') {
      res
        .status(400)
        .json({ message: `Invalid member: ${memberValidationResult.message}` });
      return;
    }

    const modInfoValidationResult = validateObjectByTypes(
      (req.body as Member).modificationInfo,
      modificationInfoTypes,
    );
    if (modInfoValidationResult !== 'valid') {
      res.status(400).json({
        message: `Invalid member modification info: ${modInfoValidationResult.message}`,
      });
      return;
    }

    const preparedMember = prepareMemberForDB(req.body);
    const result = await MemberModel.updateOne(
      { _id: new ObjectId(id) },
      { $set: preparedMember },
    );

    if (result.matchedCount === 0 || result.modifiedCount === 0) {
      res.status(404).json({
        message: `Unable to update member [${id}] - member not found`,
      });
      return;
    }

    res.status(200).json({ data: id });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function updateMembers(
  req: Request,
  res: Response<ApiResponse<Id[]>>,
): Promise<void> {
  try {
    const members = req.body as Member[];
    if (!Array.isArray(members) || members.length === 0) {
      res.status(400).json({ message: 'Invalid request body: expected non-empty array' });
      return;
    }

    for (const member of members) {
      const memberValidationResult = validateObjectByTypes(member, memberTypes);
      if (memberValidationResult !== 'valid') {
        res
          .status(400)
          .json({ message: `Invalid member: ${memberValidationResult.message}` });
        return;
      }

      const modInfoValidationResult = validateObjectByTypes(
        member.modificationInfo,
        modificationInfoTypes,
      );
      if (modInfoValidationResult !== 'valid') {
        res.status(400).json({
          message: `Invalid member modification info: ${modInfoValidationResult.message}`,
        });
        return;
      }
    }

    const session = await MemberModel.startSession();
    const updatedIds: Id[] = [];
    try {
      await session.withTransaction(async () => {
        for (const member of members) {
          const preparedMember = prepareMemberForDB(member);
          const result = await MemberModel.updateOne(
            { _id: new ObjectId(member.id) },
            { $set: preparedMember },
            { session },
          );

          if (result.matchedCount === 0) {
            throw new Error(`NOT_FOUND:${member.id}`);
          }
          updatedIds.push(member.id);
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('NOT_FOUND:')) {
        const id = error.message.split(':')[1];
        res.status(404).json({
          message: `Unable to update members - member [${id}] not found`,
        });
        return;
      }
      res.status(500).json({
        message: `Unable to update members: ${error}`,
      });
    } finally {
      await session.endSession();
    }

    res.status(200).json({ data: updatedIds });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function deleteMember(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<Id>>,
): Promise<void> {
  try {
    const { id } = req.params;

    const result = await MemberModel.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      res.status(404).json({
        message: `Unable to delete member [${id}] - member not found`,
      });
      return;
    }

    res.status(200).json({ data: id });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

// Remove id property and order remaining properties alphabetically
function prepareMemberForDB(member: Member): Omit<Member, 'id'> {
  return {
    chessComUsername: member.chessComUsername,
    city: member.city,
    dateJoined: member.dateJoined,
    email: member.email,
    firstName: member.firstName,
    isActive: member.isActive,
    lastName: member.lastName,
    lichessUsername: member.lichessUsername,
    modificationInfo: {
      createdBy: member.modificationInfo.createdBy,
      dateCreated: member.modificationInfo.dateCreated,
      dateLastEdited: member.modificationInfo.dateLastEdited,
      lastEditedBy: member.modificationInfo.lastEditedBy,
    },
    peakRating: member.peakRating,
    phoneNumber: member.phoneNumber,
    rating: member.rating,
    yearOfBirth: member.yearOfBirth,
  };
}
