import { Request, Response } from 'express';
import { PipelineStage, Types } from 'mongoose';

import { ApiPaginatedResponse, ApiResponse } from '../models/api-response.model';
import { Id } from '../models/core.model';
import {
  EditableMemberFields,
  Member,
  MemberAccount,
  MemberModel,
  MemberRecord,
  editableMemberTypes,
  memberSortingConfig,
} from '../models/member.model';
import { modificationInfoTypes } from '../models/modification-info.model';
import { clerkClient } from '../services/clerk.service';
import { sendEmail } from '../services/email.service';
import { findEditor, isLinkedMember } from '../services/member-accounts.service';
import { assignMemberNumber } from '../services/member-numbers.service';
import { isAllowedOrigin } from '../util/allowed-origins.util';
import { clerkErrorCode, clerkErrorMessage } from '../util/clerk-error.util';
import { isCollectionId } from '../util/is-collection-id.util';
import {
  MemberChange,
  RATING_FIELDS,
  describeMemberChanges,
} from '../util/member-changes.util';
import { EMAIL_PATTERN, validateDetailField } from '../util/member-details.util';
import { buildMemberChangesEmail, buildWelcomeEmail } from '../util/member-emails.util';
import {
  AdminMember,
  LinkedMemberRecord,
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
import { generateTemporaryPassword } from '../util/temporary-password.util';
import { validateObjectByTypes } from '../util/validate-object-by-types.util';

type Scope = 'public' | 'admin';

type UndoStep = [description: string, undo: () => Promise<unknown>];

interface NewAccountSave {
  res: Response<ApiResponse<AdminMember>>;
  member: EditableMemberFields;
  memberId: Types.ObjectId;
  siteUrl: string;
  status: 200 | 201;
  save: (account: MemberAccount) => Promise<unknown>;
  undoSave: UndoStep;
}

interface RatingNotice {
  record: MemberRecord;
  changes: MemberChange[];
}

interface RatingsUpdateResult {
  updatedIds: Id[];
  unnotifiedMemberNames: string[];
}

const EMAILS_FROM_SITE_ONLY =
  'Member emails can only be sent from the London Chess website.';

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

// With ?notify=true, the new member also gets an account and a welcome email
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

    const member = prepareMemberForDB(
      req.body as EditableMemberFields,
      await findEditor(req.user.id),
      true,
    );

    if (req.query['notify'] !== 'true') {
      const created = await MemberModel.create(member);
      res.status(201).json({ data: toAdminMember(await readMember(created._id)) });
      return;
    }

    const siteUrl = siteUrlFor(req);
    if (!siteUrl) {
      res.status(400).json({ message: EMAILS_FROM_SITE_ONLY });
      return;
    }

    const memberId = new Types.ObjectId();
    await saveWithNewAccount({
      res,
      member,
      memberId,
      siteUrl,
      status: 201,
      save: account => MemberModel.create({ ...member, _id: memberId, account }),
      undoSave: [
        'remove the new member record',
        () => MemberModel.deleteOne({ _id: memberId }),
      ],
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

// With ?notify=true, a member without an account gets one and a welcome email, and a
// member with an account is emailed the changes
export async function updateMember(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<AdminMember>>,
): Promise<void> {
  try {
    const { id } = req.params;

    const validationProblem = validateEditableMember(req.body);
    if (validationProblem) {
      res.status(400).json({ message: validationProblem });
      return;
    }

    const existing = isCollectionId(id)
      ? await MemberModel.findById(id).lean<MemberRecord>()
      : null;
    if (!existing) {
      res.status(404).json({
        message: `Unable to update member [${id}] because it could not be found.`,
      });
      return;
    }

    const member = prepareMemberForDB(
      req.body as EditableMemberFields,
      await findEditor(req.user.id),
      false,
    );
    if (existing.account && member.email !== existing.email) {
      res.status(400).json({
        message: "This member's email address is managed by their account.",
      });
      return;
    }

    const notify = req.query['notify'] === 'true';
    const siteUrl = notify ? siteUrlFor(req) : null;
    if (notify && !siteUrl) {
      res.status(400).json({ message: EMAILS_FROM_SITE_ONLY });
      return;
    }

    if (isLinkedMember(existing)) {
      await saveForAccountHolder(res, existing, member, siteUrl);
    } else if (siteUrl) {
      await saveWithNewAccount({
        res,
        member,
        memberId: existing._id,
        siteUrl,
        status: 200,
        save: async account => {
          // The user.created webhook may have linked this member to the new account first
          const result = await MemberModel.updateOne(
            {
              _id: existing._id,
              $or: [{ account: null }, { 'account.clerkUserId': account.clerkUserId }],
            },
            { $set: { ...member, account } },
          );
          if (result.matchedCount === 0) {
            throw new Error(
              'Another account was linked to this member at the same time.',
            );
          }
        },
        undoSave: [
          'restore the member record',
          () => MemberModel.replaceOne({ _id: existing._id }, existing),
        ],
      });
    } else {
      await MemberModel.updateOne({ _id: existing._id }, { $set: member });
      res.status(200).json({ data: toAdminMember(await readMember(existing._id)) });
    }
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

// Members with an account are emailed their new rating
export async function updateMembers(
  req: Request,
  res: Response<ApiResponse<RatingsUpdateResult>>,
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

    const updates = new Map(members.map(member => [member.id, member]));
    const accountHolders = await MemberModel.find({
      _id: { $in: [...updates.keys()] },
      'account.clerkUserId': { $ne: null },
    }).lean<MemberRecord[]>();
    const notices: RatingNotice[] = accountHolders.flatMap(record => {
      const update = updates.get(record._id.toString());
      const changes = update ? describeMemberChanges(record, update, RATING_FIELDS) : [];
      return changes.length ? [{ record, changes }] : [];
    });

    const siteUrl = siteUrlFor(req);
    if (notices.length && !siteUrl) {
      res.status(400).json({ message: EMAILS_FROM_SITE_ONLY });
      return;
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
      return;
    } finally {
      await session.endSession();
    }

    const unnotifiedMemberNames = siteUrl
      ? await emailRatingChanges(notices, siteUrl)
      : [];
    res.status(200).json({ data: { updatedIds, unnotifiedMemberNames } });
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

// Creates the member's Clerk account, saves their record with it and emails them their
// login details. A failure at any step undoes the rest, so Clerk and the database
// never disagree about who has an account
async function saveWithNewAccount({
  res,
  member,
  memberId,
  siteUrl,
  status,
  save,
  undoSave,
}: NewAccountSave): Promise<void> {
  const accountProblem = accountDetailsProblem(member);
  if (accountProblem) {
    res.status(400).json({ message: accountProblem });
    return;
  }

  const temporaryPassword = generateTemporaryPassword();
  let clerkUserId: string;
  try {
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [member.email],
      firstName: member.firstName,
      lastName: member.lastName,
      password: temporaryPassword,
      publicMetadata: { memberId: memberId.toString() },
    });
    clerkUserId = clerkUser.id;
  } catch (error) {
    res.status(400).json({
      message:
        clerkErrorCode(error) === 'form_identifier_exists'
          ? 'That email address is taken. Please check the email and try again.'
          : clerkErrorMessage(error, "Unable to create the member's account."),
    });
    return;
  }

  const undoSteps: UndoStep[] = [
    ['remove their new Clerk account', () => clerkClient.users.deleteUser(clerkUserId)],
  ];
  let failedStep = 'require a new password at their first login';
  try {
    await clerkClient.users.setPasswordCompromised(clerkUserId);

    failedStep = 'save the member';
    await save(newAccount(clerkUserId));
    undoSteps.push(undoSave);

    failedStep = 'assign a member number';
    await assignMemberNumber(memberId.toString());
    const record = await readMember(memberId);

    failedStep = 'send the welcome email';
    const email = buildWelcomeEmail(
      record,
      temporaryPassword,
      siteUrl,
      profileUrlFor(siteUrl, record),
    );
    await sendEmail(record.email, email.subject, email.text, email.html);

    res.status(status).json({ data: toAdminMember(record) });
  } catch (error) {
    await failSave(res, failedStep, error, undoSteps);
  }
}

// Keeps the member's name in Clerk in step with their record, and emails them the
// changes when a site URL is given. A failure puts both back as they were
async function saveForAccountHolder(
  res: Response<ApiResponse<AdminMember>>,
  existing: LinkedMemberRecord,
  member: EditableMemberFields,
  siteUrl: string | null,
): Promise<void> {
  const { clerkUserId } = existing.account;
  const isNameChanged =
    member.firstName !== existing.firstName || member.lastName !== existing.lastName;

  const undoSteps: UndoStep[] = [];
  let failedStep = "update the member's name in Clerk";
  try {
    if (isNameChanged) {
      await clerkClient.users.updateUser(clerkUserId, {
        firstName: member.firstName,
        lastName: member.lastName,
      });
      undoSteps.push([
        "restore the member's name in Clerk",
        () =>
          clerkClient.users.updateUser(clerkUserId, {
            firstName: existing.firstName,
            lastName: existing.lastName,
          }),
      ]);
    }

    failedStep = 'save the member';
    await MemberModel.updateOne({ _id: existing._id }, { $set: member });
    undoSteps.push([
      'restore the member record',
      () => MemberModel.replaceOne({ _id: existing._id }, existing),
    ]);
    const record = await readMember(existing._id);

    const changes = describeMemberChanges(existing, member);
    if (siteUrl && changes.length) {
      failedStep = 'email the member about the changes';
      const email = buildMemberChangesEmail(
        record,
        changes,
        profileUrlFor(siteUrl, record),
      );
      await sendEmail(record.email, email.subject, email.text, email.html);
    }

    res.status(200).json({ data: toAdminMember(record) });
  } catch (error) {
    await failSave(res, failedStep, error, undoSteps);
  }
}

// Ratings are already saved when these go out, so a failed email is reported back
// rather than undoing everyone's new rating
async function emailRatingChanges(
  notices: RatingNotice[],
  siteUrl: string,
): Promise<string[]> {
  const results = await Promise.allSettled(
    notices.map(async ({ record, changes }) => {
      const email = buildMemberChangesEmail(
        record,
        changes,
        profileUrlFor(siteUrl, record),
      );
      await sendEmail(record.email, email.subject, email.text, email.html);
    }),
  );

  return notices
    .filter((_, index) => results[index].status === 'rejected')
    .map(({ record }) => `${record.firstName} ${record.lastName}`);
}

async function failSave(
  res: Response<ApiResponse<AdminMember>>,
  failedStep: string,
  error: unknown,
  undoSteps: UndoStep[],
): Promise<void> {
  // One at a time and in order, so a new Clerk account is gone before the member record
  // is restored and a late webhook for it finds no account to link
  const leftovers: string[] = [];
  for (const [description, undo] of undoSteps) {
    try {
      await undo();
    } catch {
      leftovers.push(description);
    }
  }
  const reason = clerkErrorMessage(
    error,
    error instanceof Error ? error.message : String(error),
  );

  res.status(500).json({
    message: leftovers.length
      ? `Unable to ${failedStep}, and the site could not ${leftovers.join(' or ')}. Please fix this before trying again. ${reason}`
      : `Unable to ${failedStep}, so nothing was saved. ${reason}`,
  });
}

function accountDetailsProblem(member: EditableMemberFields): string | null {
  if (!EMAIL_PATTERN.test(member.email)) {
    return 'A valid email address is needed to create an account.';
  }
  return validateDetailField('yearOfBirth', member.yearOfBirth);
}

function newAccount(clerkUserId: string): MemberAccount {
  return {
    clerkUserId,
    isAdmin: false,
    clerkImageUrl: null,
    avatarUrl: null,
    avatarOriginalUrl: null,
    avatarManagedByApp: false,
    avatarCropState: null,
    avatarUpdatedAt: null,
  };
}

async function readMember(id: Types.ObjectId): Promise<MemberRecord> {
  const record = await MemberModel.findById(id).lean<MemberRecord>();
  if (!record) {
    throw new Error('The saved member could not be read back.');
  }
  return record;
}

// Links in member emails lead back to the site the admin saved from
function siteUrlFor(req: Pick<Request, 'header'>): string | null {
  const origin = req.header('origin');
  return origin && isAllowedOrigin(origin) ? origin : null;
}

function profileUrlFor(siteUrl: string, record: MemberRecord): string {
  if (typeof record.number !== 'number') {
    throw new Error('The member has no member number.');
  }
  return `${siteUrl}/members/${record.number}`;
}
