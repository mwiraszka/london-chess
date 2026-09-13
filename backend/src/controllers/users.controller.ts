import { Request, Response } from 'express';
import { createHash, randomInt } from 'node:crypto';

import { clerkClient } from '../middlewares/auth.middleware';
import { AccountVerificationModel } from '../models/account-verification.model';
import { ApiResponse } from '../models/api-response.model';
import { Member, MemberModel } from '../models/member.model';
import { AvatarCropState, User, UserModel } from '../models/user.model';
import {
  avatarPublicUrl,
  avatarPublicUrlPrefix,
  deleteAvatar,
  uploadAvatar,
} from '../services/avatar-storage.service';
import { sendAdminEmail, sendEmail } from '../services/email.service';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type UploadedFiles = Record<string, Express.Multer.File[]> | undefined;

function parseCropState(raw: unknown): AvatarCropState | null {
  if (typeof raw !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AvatarCropState> | null;
    if (
      parsed &&
      typeof parsed.zoom === 'number' &&
      typeof parsed.offsetX === 'number' &&
      typeof parsed.offsetY === 'number'
    ) {
      return { zoom: parsed.zoom, offsetX: parsed.offsetX, offsetY: parsed.offsetY };
    }
  } catch {
    // fall through to null
  }
  return null;
}

function clerkErrorMessage(error: unknown, fallback: string): string {
  const clerkError = error as { errors?: Array<{ longMessage?: string }> };
  const message = clerkError.errors?.[0]?.longMessage ?? fallback;
  return /[.!?]$/.test(message) ? message : `${message}.`;
}

export interface UserAvatarEntry {
  name: string;
  imageUrl: string | null;
}

export async function getUserAvatars(
  _req: Request,
  res: Response<ApiResponse<UserAvatarEntry[]>>,
): Promise<void> {
  try {
    const users = await UserModel.find({}, 'firstName lastName clerkImageUrl').lean();
    const data = users.map(user => ({
      name: `${user.firstName} ${user.lastName}`.trim(),
      imageUrl: user.clerkImageUrl ?? null,
    }));
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: `Unable to fetch user avatars: ${error}` });
  }
}

const MEMBER_DETAIL_RULES = {
  phoneNumber: {
    pattern: /^[0-9()+\-. ]{7,20}$/,
    message:
      'Phone number must be 7 to 20 characters using digits, spaces, and ()+-. only.',
  },
  lichessUsername: {
    pattern: /^[a-zA-Z0-9_-]{2,20}$/,
    message:
      'Lichess username must be 2 to 20 letters, numbers, hyphens, or underscores.',
  },
  chessComUsername: {
    pattern: /^[a-zA-Z0-9_-]{3,25}$/,
    message:
      'Chess.com username must be 3 to 25 letters, numbers, hyphens, or underscores.',
  },
} as const;

type MemberDetailField = keyof typeof MEMBER_DETAIL_RULES;

async function findOwnMember(clerkId: string) {
  const user = (await UserModel.findOne({ id: clerkId }))?.toObject();
  if (!user?.email) {
    return null;
  }
  return MemberModel.findOne({ email: user.email });
}

export async function getMyMember(
  req: Request,
  res: Response<ApiResponse<Member>>,
): Promise<void> {
  try {
    const member = await findOwnMember(req.user.id);
    if (!member) {
      res.status(404).json({ message: 'No member record is linked to this account.' });
      return;
    }
    const { _id, ...rest } = member.toObject();
    res.status(200).json({ data: { ...rest, id: _id.toString() } });
  } catch (error) {
    res.status(500).json({ message: `Unable to fetch member record: ${error}` });
  }
}

const DETAIL_FIELDS = {
  firstName: 'First name',
  lastName: 'Last name',
  yearOfBirth: 'Year of birth',
  city: 'City',
  phoneNumber: 'Phone number',
  lichessUsername: 'Lichess username',
  chessComUsername: 'Chess.com username',
} as const;

type DetailField = keyof typeof DETAIL_FIELDS;

const REQUIRED_DETAIL_FIELDS: readonly DetailField[] = [
  'firstName',
  'lastName',
  'yearOfBirth',
  'city',
];

function validateDetailField(field: DetailField, value: string): string | null {
  if (!value) {
    return REQUIRED_DETAIL_FIELDS.includes(field)
      ? `${DETAIL_FIELDS[field]} is required.`
      : null;
  }
  if (field === 'yearOfBirth' && !/^\d{4}$/.test(value)) {
    return 'Year of birth must be a four-digit year.';
  }
  if (field === 'city' && value.length > 50) {
    return 'City must be 50 characters or fewer.';
  }
  if ((field === 'firstName' || field === 'lastName') && value.length > 50) {
    return 'Names must be 50 characters or fewer.';
  }
  const rule = MEMBER_DETAIL_RULES[field as MemberDetailField] as
    { pattern: RegExp; message: string } | undefined;
  if (rule && !rule.pattern.test(value)) {
    return rule.message;
  }
  return null;
}

export async function requestMemberDetailsChange(
  req: Request,
  res: Response<ApiResponse<'success'>>,
): Promise<void> {
  try {
    const requested: Partial<Record<DetailField, string>> = {};
    for (const field of Object.keys(DETAIL_FIELDS) as DetailField[]) {
      const value = (req.body as Record<string, unknown>)[field];
      if (value === undefined) {
        continue;
      }
      if (typeof value !== 'string') {
        res.status(400).json({ message: `${DETAIL_FIELDS[field]} must be text.` });
        return;
      }
      const trimmed = value.trim();
      const problem = validateDetailField(field, trimmed);
      if (problem) {
        res.status(400).json({ message: problem });
        return;
      }
      requested[field] = trimmed;
    }

    const member = await findOwnMember(req.user.id);
    if (!member) {
      res.status(404).json({ message: 'No member record is linked to this account.' });
      return;
    }

    const current = member.toObject();
    const rows: Array<[string, string, string]> = [];
    for (const field of Object.keys(requested) as DetailField[]) {
      const before = String(current[field] ?? '');
      const after = requested[field] ?? '';
      if (before !== after) {
        rows.push([DETAIL_FIELDS[field], before || '(empty)', after || '(empty)']);
      }
    }
    if (!rows.length) {
      res.status(400).json({ message: 'No changes were requested.' });
      return;
    }

    const name = `${current.firstName} ${current.lastName}`.trim();
    const html = `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2 style="margin: 0 0 4px;">Member details change request</h2>
        <p style="margin: 0 0 16px;">${escapeHtml(name)} has requested these changes to their member record.</p>
        <table style="border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 16px 6px 0; font-weight: bold;">Field</td>
            <td style="padding: 6px 16px 6px 0; font-weight: bold;">Current</td>
            <td style="padding: 6px 0; font-weight: bold;">Requested</td>
          </tr>
          ${rows
            .map(
              ([label, before, after]) => `
                <tr>
                  <td style="padding: 6px 16px 6px 0;">${escapeHtml(label)}</td>
                  <td style="padding: 6px 16px 6px 0;">${escapeHtml(before)}</td>
                  <td style="padding: 6px 0;">${escapeHtml(after)}</td>
                </tr>`,
            )
            .join('')}
        </table>
      </div>`;
    const text = `Member details change request from ${name}\n\n${rows
      .map(([label, before, after]) => `${label}: ${before} -> ${after}`)
      .join('\n')}`;

    await sendAdminEmail(`Member details change request from ${name}`, text, html);

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to submit change request: ${error}` });
  }
}

export interface UserSession {
  id: string;
  isCurrent: boolean;
  isMobile: boolean;
  browserName: string | null;
  deviceType: string | null;
  lastActiveAt: number;
}

// Listed from the backend so devices signing in or out elsewhere show up
// immediately; the client-side list is served from a cache
export async function listMySessions(
  req: Request,
  res: Response<ApiResponse<UserSession[]>>,
): Promise<void> {
  try {
    const sessions = await clerkClient.sessions.getSessionList({
      userId: req.user.id,
      status: 'active',
      limit: 100,
    });
    res.status(200).json({
      data: sessions.data.map(session => ({
        id: session.id,
        isCurrent: session.id === req.user.sessionId,
        isMobile: session.latestActivity?.isMobile ?? false,
        browserName: session.latestActivity?.browserName ?? null,
        deviceType: session.latestActivity?.deviceType ?? null,
        lastActiveAt: session.lastActiveAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: `Unable to fetch sessions: ${error}` });
  }
}

// Clerk treats session revocation as a step-up operation client-side, so
// other sessions are revoked here with the backend key instead
export async function revokeOtherSessions(
  req: Request,
  res: Response<ApiResponse<'success'>>,
): Promise<void> {
  try {
    const sessions = await clerkClient.sessions.getSessionList({
      userId: req.user.id,
      status: 'active',
      limit: 100,
    });
    await Promise.all(
      sessions.data
        .filter(session => session.id !== req.user.sessionId)
        .map(session => clerkClient.sessions.revokeSession(session.id)),
    );
    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to log out other sessions: ${error}` });
  }
}

export async function getMe(
  req: Request,
  res: Response<ApiResponse<User>>,
): Promise<void> {
  try {
    const user = (await UserModel.findOne({ id: req.user.id }))?.toObject();
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    // Older records store avatar URLs under a retired public prefix; the
    // object keys are deterministic, so point them at the current location
    // and persist the repair
    if (
      user.avatarOriginalUrl &&
      !user.avatarOriginalUrl.startsWith(`${avatarPublicUrlPrefix()}/`)
    ) {
      user.avatarOriginalUrl = avatarPublicUrl(user.id, 'original');
      if (user.avatarUrl) {
        user.avatarUrl = avatarPublicUrl(user.id, 'cropped');
      }
      await UserModel.updateOne(
        { id: user.id },
        {
          $set: { avatarOriginalUrl: user.avatarOriginalUrl, avatarUrl: user.avatarUrl },
        },
      );
    }
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ message: `Unable to fetch user: ${error}` });
  }
}

export async function updateMe(
  req: Request,
  res: Response<ApiResponse<User>>,
): Promise<void> {
  try {
    const { firstName, lastName, avatarCropState, clerkImageUrl } = req.body as {
      firstName?: unknown;
      lastName?: unknown;
      avatarCropState?: unknown;
      clerkImageUrl?: unknown;
    };

    const updates: Partial<User> = {};
    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || !firstName.trim()) {
        res.status(400).json({ message: 'First name must be a non-empty string.' });
        return;
      }
      updates.firstName = firstName;
    }
    if (lastName !== undefined) {
      if (typeof lastName !== 'string') {
        res.status(400).json({ message: 'Last name must be a string.' });
        return;
      }
      updates.lastName = lastName;
    }
    if (avatarCropState !== undefined) {
      updates.avatarCropState =
        avatarCropState === null ? null : parseCropState(JSON.stringify(avatarCropState));
    }
    if (clerkImageUrl !== undefined) {
      if (clerkImageUrl !== null && typeof clerkImageUrl !== 'string') {
        res.status(400).json({ message: 'Clerk image URL must be a string or null.' });
        return;
      }
      updates.clerkImageUrl = clerkImageUrl;
    }

    const user = (
      await UserModel.findOneAndUpdate(
        { id: req.user.id },
        { $set: updates },
        { new: true },
      )
    )?.toObject();

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ message: `Unable to update user: ${error}` });
  }
}

export async function changePassword(
  req: Request,
  res: Response<ApiResponse<'success'>>,
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res
        .status(400)
        .json({ message: 'New password must be at least 8 characters long.' });
      return;
    }

    const clerkUser = await clerkClient.users.getUser(req.user.id);

    // Verifying the current password server-side replaces Clerk's session
    // reverification gate, which the frontend SDK only supports through React
    if (clerkUser.passwordEnabled) {
      if (typeof currentPassword !== 'string' || !currentPassword) {
        res.status(400).json({ message: 'Current password is required.' });
        return;
      }
      try {
        await clerkClient.users.verifyPassword({
          userId: req.user.id,
          password: currentPassword,
        });
      } catch {
        res.status(400).json({ message: 'Current password is incorrect.' });
        return;
      }
    }

    try {
      await clerkClient.users.updateUser(req.user.id, { password: newPassword });
    } catch (error) {
      res
        .status(400)
        .json({ message: clerkErrorMessage(error, 'Could not update password') });
      return;
    }

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to change password: ${error}` });
  }
}

export async function uploadUserAvatar(
  req: Request,
  res: Response<ApiResponse<User>>,
): Promise<void> {
  try {
    const files = req.files as UploadedFiles;
    const file = files?.['file']?.[0];
    const cropped = files?.['cropped']?.[0];

    if (!file) {
      res.status(400).json({ message: 'File is required.' });
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      res.status(400).json({ message: 'File must be a JPEG, PNG, or WebP image.' });
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      res.status(400).json({ message: 'File must be under 5 MB.' });
      return;
    }
    if (!cropped) {
      res.status(400).json({ message: 'Cropped file is required.' });
      return;
    }

    const cropState = parseCropState(req.body['cropState']);

    const [originalUrl, croppedUrl] = await Promise.all([
      uploadAvatar(req.user.id, file.buffer, file.mimetype, 'original'),
      uploadAvatar(req.user.id, cropped.buffer, cropped.mimetype, 'cropped'),
    ]);

    const clerkUser = await clerkClient.users.updateUserProfileImage(req.user.id, {
      file: new Blob([new Uint8Array(cropped.buffer)], { type: cropped.mimetype }),
    });

    const user = (
      await UserModel.findOneAndUpdate(
        { id: req.user.id },
        {
          $set: {
            avatarUrl: croppedUrl,
            avatarOriginalUrl: originalUrl,
            avatarCropState: cropState,
            avatarManagedByApp: true,
            clerkImageUrl: clerkUser.imageUrl,
          },
        },
        { new: true },
      )
    )?.toObject();

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ message: `Unable to upload avatar: ${error}` });
  }
}

export async function updateCroppedAvatar(
  req: Request,
  res: Response<ApiResponse<User>>,
): Promise<void> {
  try {
    const files = req.files as UploadedFiles;
    const cropped = files?.['cropped']?.[0];
    if (!cropped) {
      res.status(400).json({ message: 'Cropped file is required.' });
      return;
    }

    const cropState = parseCropState(req.body['cropState']);

    const croppedUrl = await uploadAvatar(
      req.user.id,
      cropped.buffer,
      cropped.mimetype,
      'cropped',
    );

    const clerkUser = await clerkClient.users.updateUserProfileImage(req.user.id, {
      file: new Blob([new Uint8Array(cropped.buffer)], { type: cropped.mimetype }),
    });

    const user = (
      await UserModel.findOneAndUpdate(
        { id: req.user.id },
        {
          $set: {
            avatarUrl: croppedUrl,
            avatarCropState: cropState,
            clerkImageUrl: clerkUser.imageUrl,
          },
        },
        { new: true },
      )
    )?.toObject();

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ message: `Unable to update avatar: ${error}` });
  }
}

export async function deleteUserAvatar(
  req: Request,
  res: Response<ApiResponse<User>>,
): Promise<void> {
  try {
    await deleteAvatar(req.user.id);

    await clerkClient.users.deleteUserProfileImage(req.user.id);
    const clerkUser = await clerkClient.users.getUser(req.user.id);
    // Without a photo, Clerk reports a placeholder imageUrl; store null so
    // clients fall back to initials
    const clerkImageUrl = clerkUser.hasImage ? clerkUser.imageUrl : null;

    const user = (
      await UserModel.findOneAndUpdate(
        { id: req.user.id },
        {
          $set: {
            avatarUrl: null,
            avatarOriginalUrl: null,
            avatarCropState: null,
            avatarManagedByApp: false,
            clerkImageUrl,
          },
        },
        { new: true },
      )
    )?.toObject();

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ message: `Unable to delete avatar: ${error}` });
  }
}

export async function deleteMe(
  req: Request,
  res: Response<ApiResponse<'success'>>,
): Promise<void> {
  try {
    // Delete from Clerk first: once it succeeds the user's tokens are invalid,
    // so the auth middleware can't lazy-recreate the document mid-deletion. If
    // a later step fails, the user.deleted webhook reconciles the leftovers.
    await clerkClient.users.deleteUser(req.user.id);

    try {
      await deleteAvatar(req.user.id);
    } catch {
      // avatar may not exist in R2
    }

    await UserModel.deleteOne({ id: req.user.id });

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to delete user: ${error}` });
  }
}

export async function getUserAvatar(req: Request, res: Response): Promise<void> {
  try {
    const user = await UserModel.findOne({ id: req.params['id'] }).select(
      'avatarOriginalUrl',
    );
    if (!user?.avatarOriginalUrl) {
      res.status(404).json({ message: 'No avatar found.' });
      return;
    }

    // Only ever proxy objects from our own R2 bucket; never fetch an arbitrary
    // stored URL, so a poisoned field can't turn this into an SSRF vector
    if (!user.avatarOriginalUrl.startsWith(`${avatarPublicUrlPrefix()}/`)) {
      res.status(404).json({ message: 'No avatar found.' });
      return;
    }

    const r2Response = await fetch(user.avatarOriginalUrl);
    if (!r2Response.ok) {
      res.status(502).json({ message: 'Failed to fetch avatar.' });
      return;
    }

    res
      .status(200)
      .set('Content-Type', r2Response.headers.get('content-type') || 'image/jpeg')
      .set('Cache-Control', 'public, max-age=3600')
      .send(Buffer.from(await r2Response.arrayBuffer()));
  } catch (error) {
    res.status(500).json({ message: `Unable to fetch avatar: ${error}` });
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidYearOfBirth(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1900 &&
    value <= new Date().getFullYear()
  );
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_MS = 60 * 1000;
const VERIFICATION_MAX_ATTEMPTS = 5;

function hashVerificationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// Proving inbox access before a request reaches the admin mailbox keeps the
// form from being used to flood it
export async function requestAccountVerification(
  req: Request,
  res: Response<ApiResponse<'success'>>,
): Promise<void> {
  try {
    const { email } = req.body as { email?: unknown };
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
      res.status(400).json({ message: 'A valid email address is required.' });
      return;
    }
    const normalized = email.trim().toLowerCase();

    const existing = await AccountVerificationModel.findOne({ email: normalized });
    if (existing && Date.now() - existing.lastSentAt.getTime() < VERIFICATION_RESEND_MS) {
      res.status(429).json({
        message:
          'A code was sent moments ago – please wait a minute before requesting another.',
      });
      return;
    }

    const code = String(randomInt(100000, 1000000));
    await AccountVerificationModel.findOneAndUpdate(
      { email: normalized },
      {
        email: normalized,
        codeHash: hashVerificationCode(code),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        attempts: 0,
        lastSentAt: new Date(),
      },
      { upsert: true },
    );

    await sendEmail(
      email.trim(),
      'Your London Chess Club verification code',
      `Your verification code is ${code}. It expires in 10 minutes.`,
      `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2 style="margin: 0 0 8px;">London Chess Club</h2>
        <p style="margin: 0 0 16px;">Use this code to verify your email address. It expires in 10 minutes.</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 0;">${code}</p>
      </div>`,
    );

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to send verification code: ${error}` });
  }
}

async function consumeVerificationCode(
  email: string,
  code: string,
): Promise<string | null> {
  const record = await AccountVerificationModel.findOne({
    email: email.trim().toLowerCase(),
  });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    return 'Your verification code has expired – please request a new one.';
  }
  if (record.attempts >= VERIFICATION_MAX_ATTEMPTS) {
    return 'Too many incorrect attempts – please request a new code.';
  }
  if (record.codeHash !== hashVerificationCode(code)) {
    record.attempts += 1;
    await record.save();
    return 'That verification code is incorrect.';
  }
  await record.deleteOne();
  return null;
}

export async function requestAccount(
  req: Request,
  res: Response<ApiResponse<'success'>>,
): Promise<void> {
  try {
    const {
      firstName,
      lastName,
      email,
      yearOfBirth,
      city,
      phoneNumber,
      lichessUsername,
      chessComUsername,
    } = req.body as {
      firstName?: unknown;
      lastName?: unknown;
      email?: unknown;
      yearOfBirth?: unknown;
      city?: unknown;
      phoneNumber?: unknown;
      lichessUsername?: unknown;
      chessComUsername?: unknown;
    };

    if (
      typeof firstName !== 'string' ||
      !firstName.trim() ||
      typeof lastName !== 'string' ||
      !lastName.trim()
    ) {
      res.status(400).json({ message: 'First and last name are required.' });
      return;
    }
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
      res.status(400).json({ message: 'A valid email address is required.' });
      return;
    }
    if (!isValidYearOfBirth(yearOfBirth)) {
      res.status(400).json({ message: 'A valid year of birth is required.' });
      return;
    }
    const { verificationCode } = req.body as { verificationCode?: unknown };
    if (
      typeof verificationCode !== 'string' ||
      !/^\d{6}$/.test(verificationCode.trim())
    ) {
      res.status(400).json({ message: 'A six-digit verification code is required.' });
      return;
    }
    const codeProblem = await consumeVerificationCode(email, verificationCode.trim());
    if (codeProblem) {
      res.status(400).json({ message: codeProblem });
      return;
    }

    if (typeof city !== 'string' || !city.trim()) {
      res.status(400).json({ message: 'City is required.' });
      return;
    }
    const cityProblem = validateDetailField('city', city.trim());
    if (cityProblem) {
      res.status(400).json({ message: cityProblem });
      return;
    }

    const optional: Array<[DetailField, unknown, string]> = [
      ['phoneNumber', phoneNumber, 'Phone number'],
      ['lichessUsername', lichessUsername, 'Lichess username'],
      ['chessComUsername', chessComUsername, 'Chess.com username'],
    ];
    const extras: Array<[string, string]> = [];
    for (const [field, value, label] of optional) {
      if (value === undefined || value === '') {
        continue;
      }
      if (typeof value !== 'string') {
        res.status(400).json({ message: `${label} must be text.` });
        return;
      }
      const trimmed = value.trim();
      const problem = validateDetailField(field, trimmed);
      if (problem) {
        res.status(400).json({ message: problem });
        return;
      }
      if (trimmed) {
        extras.push([label, escapeHtml(trimmed)]);
      }
    }

    const name = `${firstName.trim()} ${lastName.trim()}`;
    const rows: Array<[string, string]> = [
      ['Name', escapeHtml(name)],
      ['Email', escapeHtml(email)],
      ['Year of birth', String(yearOfBirth)],
      ['City', escapeHtml(city.trim())],
      ...extras,
    ];
    const html = `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2 style="margin: 0 0 4px;">New account request</h2>
        <p style="margin: 0 0 16px;">Someone has requested a London Chess Club account.</p>
        <table style="border-collapse: collapse;">
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="padding: 6px 16px 6px 0; font-weight: bold;">${label}</td>
                  <td style="padding: 6px 0;">${value}</td>
                </tr>`,
            )
            .join('')}
        </table>
        <p style="margin: 16px 0 0;">
          Create their account in the Clerk dashboard and email them once it is ready.
        </p>
      </div>`;
    const text = `New account request\n\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}`;

    await sendAdminEmail(`New account request from ${name}`, text, html);

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to submit account request: ${error}` });
  }
}
