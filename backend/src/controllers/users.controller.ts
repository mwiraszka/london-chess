import { Request, Response } from 'express';
import { randomInt } from 'node:crypto';

import { AccountVerificationModel } from '../models/account-verification.model';
import { ApiResponse } from '../models/api-response.model';
import { AvatarCropState } from '../models/member.model';
import {
  avatarPublicUrl,
  avatarPublicUrlPrefix,
  deleteAvatar,
  uploadAvatar,
} from '../services/avatar-storage.service';
import { clerkClient } from '../services/clerk.service';
import { sendAdminEmail, sendEmail } from '../services/email.service';
import {
  findLinkedMember,
  unlinkClerkUser,
  updateLinkedMember,
} from '../services/member-accounts.service';
import { clerkErrorMessage } from '../util/clerk-error.util';
import {
  ChangeRow,
  buildAccountRequestEmail,
  buildDetailsChangeRequestEmail,
  buildVerificationCodeEmail,
} from '../util/emails.util';
import { hashSecret } from '../util/hash-secret.util';
import {
  DETAIL_FIELDS,
  DetailField,
  EMAIL_PATTERN,
  isValidYearOfBirth,
  validateDetailField,
} from '../util/member-details.util';
import {
  AccountRecord,
  AdminMember,
  toAccountRecord,
  toAdminMember,
} from '../util/member-responses.util';

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

function activeSessions(clerkUserId: string) {
  return clerkClient.sessions.getSessionList({
    userId: clerkUserId,
    status: 'active',
    limit: 100,
  });
}

async function setClerkImage(
  clerkUserId: string,
  file: Express.Multer.File,
): Promise<string> {
  const { imageUrl } = await clerkClient.users.updateUserProfileImage(clerkUserId, {
    file: new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
  });
  return imageUrl;
}

// Pending while Clerk changes its copy, so the webhook that follows leaves the app's photo alone
async function saveAvatarChange(
  req: Request,
  res: Response<ApiResponse<AccountRecord>>,
  changeClerkImage: () => Promise<string | null>,
  fields: Record<string, unknown>,
): Promise<void> {
  await updateLinkedMember(req.user.id, { 'account.clerkImagePending': true });
  const clerkImageUrl = await changeClerkImage();

  const member = await updateLinkedMember(req.user.id, {
    ...fields,
    'account.clerkImagePending': false,
    'account.clerkImageUrl': clerkImageUrl,
    'account.avatarUpdatedAt': new Date().toISOString(),
  });

  if (!member) {
    res.status(404).json({ message: 'Account not found.' });
    return;
  }
  res.status(200).json({ data: toAccountRecord(member) });
}

export async function getMyMember(
  req: Request,
  res: Response<ApiResponse<AdminMember>>,
): Promise<void> {
  try {
    const member = await findLinkedMember(req.user.id);
    if (!member) {
      res.status(404).json({ message: 'No member record is linked to this account.' });
      return;
    }
    res.status(200).json({ data: toAdminMember(member) });
  } catch (error) {
    res.status(500).json({ message: `Unable to fetch member record: ${error}` });
  }
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

    const current = await findLinkedMember(req.user.id);
    if (!current) {
      res.status(404).json({ message: 'No member record is linked to this account.' });
      return;
    }

    const changes: ChangeRow[] = [];
    for (const field of Object.keys(requested) as DetailField[]) {
      const before = String(current[field] ?? '');
      const after = requested[field] ?? '';
      if (before !== after) {
        changes.push({
          label: DETAIL_FIELDS[field],
          before: before || '(empty)',
          after: after || '(empty)',
        });
      }
    }
    if (!changes.length) {
      res.status(400).json({ message: 'No changes were requested.' });
      return;
    }

    const name = `${current.firstName} ${current.lastName}`.trim();
    await sendAdminEmail(buildDetailsChangeRequestEmail(name, changes));

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to submit change request: ${error}` });
  }
}

interface UserSession {
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
    const sessions = await activeSessions(req.user.id);
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
    const sessions = await activeSessions(req.user.id);
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
  res: Response<ApiResponse<AccountRecord>>,
): Promise<void> {
  try {
    let member = await findLinkedMember(req.user.id);
    if (!member) {
      res.status(404).json({ message: 'Account not found.' });
      return;
    }
    // Older records store avatar URLs under a retired public prefix; the
    // object keys are deterministic, so point them at the current location
    // and persist the repair
    const { avatarOriginalUrl, avatarUrl } = member.account;
    if (
      avatarOriginalUrl &&
      !avatarOriginalUrl.startsWith(`${avatarPublicUrlPrefix()}/`)
    ) {
      member =
        (await updateLinkedMember(req.user.id, {
          'account.avatarOriginalUrl': avatarPublicUrl(req.user.id, 'original'),
          'account.avatarUrl': avatarUrl ? avatarPublicUrl(req.user.id, 'cropped') : null,
        })) ?? member;
    }
    res.status(200).json({ data: toAccountRecord(member) });
  } catch (error) {
    res.status(500).json({ message: `Unable to fetch user: ${error}` });
  }
}

export async function updateMe(
  req: Request,
  res: Response<ApiResponse<AccountRecord>>,
): Promise<void> {
  try {
    const { avatarCropState, clerkImageUrl, showYearOfBirth } = req.body as {
      avatarCropState?: unknown;
      clerkImageUrl?: unknown;
      showYearOfBirth?: unknown;
    };

    const updates: Record<string, unknown> = {};
    if (avatarCropState !== undefined) {
      updates['account.avatarCropState'] =
        avatarCropState === null ? null : parseCropState(JSON.stringify(avatarCropState));
    }
    if (clerkImageUrl !== undefined) {
      if (clerkImageUrl !== null && typeof clerkImageUrl !== 'string') {
        res.status(400).json({ message: 'Clerk image URL must be a string or null.' });
        return;
      }
      updates['account.clerkImageUrl'] = clerkImageUrl;
    }
    if (showYearOfBirth !== undefined) {
      if (typeof showYearOfBirth !== 'boolean') {
        res.status(400).json({ message: 'Show year of birth must be true or false.' });
        return;
      }
      updates['preferences.showYearOfBirth'] = showYearOfBirth;
    }

    const member = await updateLinkedMember(req.user.id, updates);
    if (!member) {
      res.status(404).json({ message: 'Account not found.' });
      return;
    }
    res.status(200).json({ data: toAccountRecord(member) });
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
    await updateLinkedMember(req.user.id, { 'account.temporaryPasswordHash': null });

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to change password: ${error}` });
  }
}

// Forgot password sets a new password without going through the site, so the member
// confirms it here to clear their temporary password. Clerk checks it is their current
// password, and the password the site emailed never counts
export async function confirmMyPassword(
  req: Request,
  res: Response<ApiResponse<AccountRecord>>,
): Promise<void> {
  try {
    const { password } = req.body as { password?: unknown };
    if (typeof password !== 'string' || !password) {
      res.status(400).json({ message: 'Password is required.' });
      return;
    }

    const member = await findLinkedMember(req.user.id);
    if (!member) {
      res.status(404).json({ message: 'Account not found.' });
      return;
    }

    const { temporaryPasswordHash } = member.account;
    if (!temporaryPasswordHash || hashSecret(password) === temporaryPasswordHash) {
      res.status(200).json({ data: toAccountRecord(member) });
      return;
    }

    try {
      await clerkClient.users.verifyPassword({ userId: req.user.id, password });
    } catch {
      res.status(400).json({ message: 'That password does not match your account.' });
      return;
    }

    const updated = await updateLinkedMember(req.user.id, {
      'account.temporaryPasswordHash': null,
    });
    if (!updated) {
      res.status(404).json({ message: 'Account not found.' });
      return;
    }
    res.status(200).json({ data: toAccountRecord(updated) });
  } catch (error) {
    res.status(500).json({ message: `Unable to confirm password: ${error}` });
  }
}

export async function uploadUserAvatar(
  req: Request,
  res: Response<ApiResponse<AccountRecord>>,
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
    if (!cropped) {
      res.status(400).json({ message: 'Cropped file is required.' });
      return;
    }

    const cropState = parseCropState(req.body['cropState']);

    const [originalUrl, croppedUrl] = await Promise.all([
      uploadAvatar(req.user.id, file.buffer, file.mimetype, 'original'),
      uploadAvatar(req.user.id, cropped.buffer, cropped.mimetype, 'cropped'),
    ]);

    await saveAvatarChange(req, res, () => setClerkImage(req.user.id, cropped), {
      'account.avatarUrl': croppedUrl,
      'account.avatarOriginalUrl': originalUrl,
      'account.avatarCropState': cropState,
    });
  } catch (error) {
    res.status(500).json({ message: `Unable to upload avatar: ${error}` });
  }
}

export async function updateCroppedAvatar(
  req: Request,
  res: Response<ApiResponse<AccountRecord>>,
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

    await saveAvatarChange(req, res, () => setClerkImage(req.user.id, cropped), {
      'account.avatarUrl': croppedUrl,
      'account.avatarCropState': cropState,
    });
  } catch (error) {
    res.status(500).json({ message: `Unable to update avatar: ${error}` });
  }
}

export async function deleteUserAvatar(
  req: Request,
  res: Response<ApiResponse<AccountRecord>>,
): Promise<void> {
  try {
    await deleteAvatar(req.user.id);

    await saveAvatarChange(
      req,
      res,
      async () => {
        await clerkClient.users.deleteUserProfileImage(req.user.id);
        const clerkUser = await clerkClient.users.getUser(req.user.id);
        // Without a photo, Clerk reports a placeholder imageUrl; store null so
        // clients fall back to initials
        return clerkUser.hasImage ? clerkUser.imageUrl : null;
      },
      {
        'account.avatarUrl': null,
        'account.avatarOriginalUrl': null,
        'account.avatarCropState': null,
      },
    );
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
    // so the auth middleware can't relink the account mid-deletion. If a later
    // step fails, the user.deleted webhook reconciles the leftovers.
    await clerkClient.users.deleteUser(req.user.id);
    await unlinkClerkUser(req.user.id);

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to delete user: ${error}` });
  }
}

export async function getUserAvatar(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  try {
    const member = await findLinkedMember(req.params.id);
    const avatarOriginalUrl = member?.account.avatarOriginalUrl;
    if (!avatarOriginalUrl) {
      res.status(404).json({ message: 'No avatar found.' });
      return;
    }

    // Only ever proxy objects from our own R2 bucket; never fetch an arbitrary
    // stored URL, so a poisoned field can't turn this into an SSRF vector
    if (!avatarOriginalUrl.startsWith(`${avatarPublicUrlPrefix()}/`)) {
      res.status(404).json({ message: 'No avatar found.' });
      return;
    }

    const r2Response = await fetch(avatarOriginalUrl);
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

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_MS = 60 * 1000;
const VERIFICATION_MAX_ATTEMPTS = 5;

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
          'A code was sent moments ago. Please wait a minute before requesting another.',
      });
      return;
    }

    const code = String(randomInt(100000, 1000000));
    await AccountVerificationModel.findOneAndUpdate(
      { email: normalized },
      {
        email: normalized,
        codeHash: hashSecret(code),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        attempts: 0,
        lastSentAt: new Date(),
      },
      { upsert: true },
    );

    await sendEmail(email.trim(), buildVerificationCodeEmail(code));

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
  if (record.codeHash !== hashSecret(code)) {
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
        extras.push([label, trimmed]);
      }
    }

    const name = `${firstName.trim()} ${lastName.trim()}`;
    await sendAdminEmail(
      buildAccountRequestEmail(name, [
        ['Name', name],
        ['Email', email],
        ['Year of birth', String(yearOfBirth)],
        ['City', city.trim()],
        ...extras,
      ]),
    );

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to submit account request: ${error}` });
  }
}
