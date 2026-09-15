import { Request, Response } from 'express';
import { PipelineStage } from 'mongoose';

import { ApiPaginatedResponse, ApiResponse } from '../models/api-response.model';
import { Id } from '../models/core.model';
import {
  EditableMemberFields,
  Member,
  MemberModel,
  MemberRecord,
  editableMemberTypes,
  memberSortingConfig,
} from '../models/member.model';
import { modificationInfoTypes } from '../models/modification-info.model';
import { findEditor } from '../services/member-accounts.service';
import { isCollectionId } from '../util/is-collection-id.util';
import {
  AdminMember,
  MEMBER_PROFILE_PROJECTION,
  MemberProfile,
  PUBLIC_MEMBER_PROJECTION,
  PUBLIC_PROFILE_PROJECTION,
  PublicMember,
  PublicProfile,
  toAdminMember,
  toMemberProfiles,
  toPublicMember,
  toPublicProfile,
} from '../util/member-responses.util';
import { Editor, creditEditor } from '../util/modification-info.util';
import { buildPaginationQuery, parsePaginationParams } from '../util/pagination.util';
import { validateObjectByTypes } from '../util/validate-object-by-types.util';

type Scope = 'public' | 'admin';

function toResponse(scope: Scope): (record: MemberRecord) => PublicMember | AdminMember {
  return scope === 'public' ? toPublicMember : toAdminMember;
}

export function getMembers(scope: Scope) {
  return async (
    req: Request,
    res: Response<ApiPaginatedResponse<PublicMember | AdminMember>>,
  ): Promise<void> => {
    try {
      const query = buildPaginationQuery<Member>(
        parsePaginationParams(req),
        memberSortingConfig,
      );

      // Check if we're sorting by rating or peakRating - use aggregation for proper numeric sorting
      const sortField = Object.keys(query.sort)[0];
      const isRatingSort = ['rating', 'peakRating'].includes(sortField);

      let records: MemberRecord[];
      let filteredCount: number;

      if (isRatingSort) {
        const sortOrder = query.sort[sortField];
        const numericField = `${sortField}Numeric`;
        const pipeline: PipelineStage[] = [
          { $match: query.filter },
          {
            $addFields: {
              [numericField]: {
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
          { $sort: { [numericField]: sortOrder } },
          {
            $project:
              scope === 'public' ? PUBLIC_MEMBER_PROJECTION : { [numericField]: 0 },
          },
          { $skip: query.skip },
        ];

        if (query.limit !== undefined) {
          pipeline.push({ $limit: query.limit });
        }

        [records, filteredCount] = await Promise.all([
          MemberModel.aggregate<MemberRecord>(pipeline),
          MemberModel.countDocuments(query.filter),
        ]);
      } else {
        const projection = scope === 'public' ? PUBLIC_MEMBER_PROJECTION : null;
        const find = MemberModel.find(query.filter, projection)
          .sort(query.sort)
          .skip(query.skip);

        [records, filteredCount] = await Promise.all([
          (query.limit !== undefined ? find.limit(query.limit) : find).lean<
            MemberRecord[]
          >(),
          MemberModel.countDocuments(query.filter),
        ]);
      }

      const totalCount = await MemberModel.countDocuments({});

      res.status(200).json({
        data: {
          items: records.map(toResponse(scope)),
          filteredCount,
          totalCount,
        },
      });
    } catch (error) {
      res.status(500).json({ message: `Unknown error: ${error}` });
    }
  };
}

export function getMemberByNumber(scope: Scope) {
  return async (
    req: Request<{ number: string }>,
    res: Response<ApiResponse<PublicProfile | AdminMember>>,
  ): Promise<void> => {
    try {
      const { number } = req.params;
      const record = /^\d+$/.test(number)
        ? await MemberModel.findOne(
            { number: Number(number), 'account.clerkUserId': { $ne: null } },
            scope === 'public' ? PUBLIC_PROFILE_PROJECTION : null,
          ).lean<MemberRecord>()
        : null;

      if (!record) {
        res.status(404).json({ message: `Unable to find member [${number}]` });
        return;
      }

      res.status(200).json({
        data: scope === 'public' ? toPublicProfile(record) : toAdminMember(record),
      });
    } catch (error) {
      res.status(500).json({ message: `Unknown error: ${error}` });
    }
  };
}

export async function getMemberProfiles(
  _req: Request,
  res: Response<ApiResponse<MemberProfile[]>>,
): Promise<void> {
  try {
    const records = await MemberModel.find(
      { 'account.clerkUserId': { $ne: null }, number: { $exists: true } },
      MEMBER_PROFILE_PROJECTION,
    ).lean<MemberRecord[]>();

    res.status(200).json({ data: toMemberProfiles(records) });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function getMemberById(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<AdminMember>>,
): Promise<void> {
  try {
    const { id } = req.params;
    const record = isCollectionId(id)
      ? await MemberModel.findById(id).lean<MemberRecord>()
      : null;

    if (!record) {
      res.status(404).json({ message: `Unable to find member [${id}]` });
      return;
    }

    res.status(200).json({ data: toAdminMember(record) });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function addMember(
  req: Request,
  res: Response<ApiResponse<AdminMember>>,
): Promise<void> {
  try {
    const validationProblem = validateEditableMember(req.body);
    if (validationProblem) {
      res.status(400).json({ message: validationProblem });
      return;
    }

    const created = await MemberModel.create(
      prepareMemberForDB(
        req.body as EditableMemberFields,
        await findEditor(req.user.id),
        true,
      ),
    );
    const record = await MemberModel.findById(created._id).lean<MemberRecord>();
    if (!record) {
      throw new Error('The new member could not be read back.');
    }

    res.status(201).json({ data: toAdminMember(record) });
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

    const validationProblem = validateEditableMember(req.body);
    if (validationProblem) {
      res.status(400).json({ message: validationProblem });
      return;
    }

    const existing = isCollectionId(id)
      ? await MemberModel.findById(id, { email: 1, account: 1 }).lean<MemberRecord>()
      : null;
    if (!existing) {
      res.status(404).json({
        message: `Unable to update member [${id}] because it could not be found.`,
      });
      return;
    }

    const preparedMember = prepareMemberForDB(
      req.body as EditableMemberFields,
      await findEditor(req.user.id),
      false,
    );
    if (existing.account && preparedMember.email !== existing.email) {
      res.status(400).json({
        message: "This member's email address is managed by their account.",
      });
      return;
    }

    const result = await MemberModel.updateOne({ _id: id }, { $set: preparedMember });

    if (result.matchedCount === 0 || result.modifiedCount === 0) {
      res.status(404).json({
        message: `Unable to update member [${id}] because it could not be found.`,
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
    const members = req.body as Array<EditableMemberFields & { id: Id }>;
    if (!Array.isArray(members) || members.length === 0) {
      res.status(400).json({ message: 'Invalid request body: expected non-empty array' });
      return;
    }

    for (const { id, ...member } of members) {
      if (!isCollectionId(id)) {
        res.status(400).json({ message: `Invalid member id [${id}]` });
        return;
      }
      const validationProblem = validateEditableMember(member);
      if (validationProblem) {
        res.status(400).json({ message: validationProblem });
        return;
      }
    }

    const editor = await findEditor(req.user.id);
    const session = await MemberModel.startSession();
    const updatedIds: Id[] = [];
    try {
      await session.withTransaction(async () => {
        for (const { id, ...member } of members) {
          const result = await MemberModel.updateOne(
            { _id: id },
            { $set: prepareMemberForDB(member, editor, false) },
            { session },
          );

          if (result.matchedCount === 0) {
            throw new Error(`NOT_FOUND:${id}`);
          }
          updatedIds.push(id);
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('NOT_FOUND:')) {
        const id = error.message.split(':')[1];
        res.status(404).json({
          message: `Unable to update members because member [${id}] could not be found.`,
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

    const existing = isCollectionId(id)
      ? await MemberModel.findById(id, { account: 1 }).lean<MemberRecord>()
      : null;
    if (!existing) {
      res.status(404).json({
        message: `Unable to delete member [${id}] because it could not be found.`,
      });
      return;
    }
    if (existing.account) {
      res.status(409).json({
        message: 'This member has an account, so their record cannot be deleted.',
      });
      return;
    }

    await MemberModel.deleteOne({ _id: id });

    res.status(200).json({ data: id });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

function validateEditableMember(body: unknown): string | null {
  const memberValidationResult = validateObjectByTypes(body, editableMemberTypes);
  if (memberValidationResult !== 'valid') {
    return `Invalid member: ${memberValidationResult.message}`;
  }

  const modInfoValidationResult = validateObjectByTypes(
    (body as EditableMemberFields).modificationInfo,
    modificationInfoTypes,
  );
  if (modInfoValidationResult !== 'valid') {
    return `Invalid member modification info: ${modInfoValidationResult.message}`;
  }

  return null;
}

// Remove id property and order remaining properties alphabetically
function prepareMemberForDB(
  member: EditableMemberFields,
  editor: Editor,
  isNew: boolean,
): EditableMemberFields {
  return {
    chessComUsername: member.chessComUsername,
    city: member.city,
    dateJoined: member.dateJoined,
    email: member.email,
    firstName: member.firstName,
    isActive: member.isActive,
    lastName: member.lastName,
    lichessUsername: member.lichessUsername,
    modificationInfo: creditEditor(member.modificationInfo, editor, isNew),
    peakRating: member.peakRating,
    phoneNumber: member.phoneNumber,
    rating: member.rating,
    yearOfBirth: member.yearOfBirth,
  };
}
