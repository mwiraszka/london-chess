import { Request, Response } from 'express';

import { clerkClient } from '../middlewares/auth.middleware';
import { ApiResponse } from '../models/api-response.model';
import { AvatarCropState, User, UserModel } from '../models/user.model';
import {
  avatarPublicUrlPrefix,
  deleteAvatar,
  uploadAvatar,
} from '../services/avatar-storage.service';
import { sendAdminEmail } from '../services/email.service';

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

export async function requestAccount(
  req: Request,
  res: Response<ApiResponse<'success'>>,
): Promise<void> {
  try {
    const { firstName, lastName, email, yearOfBirth } = req.body as {
      firstName?: unknown;
      lastName?: unknown;
      email?: unknown;
      yearOfBirth?: unknown;
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

    const name = `${firstName.trim()} ${lastName.trim()}`;
    const rows: Array<[string, string]> = [
      ['Name', escapeHtml(name)],
      ['Email', escapeHtml(email)],
      ['Year of birth', String(yearOfBirth)],
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
    const text = `New account request\n\nName: ${name}\nEmail: ${email}\nYear of birth: ${yearOfBirth}`;

    await sendAdminEmail(`New account request from ${name}`, text, html);

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to submit account request: ${error}` });
  }
}
