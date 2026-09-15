import { type User } from '@clerk/backend';
import { isClerkAPIResponseError } from '@clerk/backend/errors';
import { Types } from 'mongoose';

import { MemberAccount, MemberModel, MemberRecord } from '../models/member.model';
import { LinkedMemberRecord } from '../util/member-responses.util';
import { Editor } from '../util/modification-info.util';
import { deleteAvatar, uploadAvatar } from './avatar-storage.service';
import { clerkClient } from './clerk.service';
import { assignMemberNumber } from './member-numbers.service';

export interface ClerkProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  hasImage: boolean;
  isAdmin: boolean;
  // The member this user belongs to, set in the user's Clerk public metadata
  memberId: string | null;
}

export function isLinkedMember(
  record: MemberRecord | null,
): record is LinkedMemberRecord {
  return typeof record?.account?.clerkUserId === 'string';
}

export function toClerkProfile(user: User): ClerkProfile {
  const memberId = user.publicMetadata['memberId'];
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    imageUrl: user.imageUrl,
    hasImage: user.hasImage,
    isAdmin: user.publicMetadata['isAdmin'] === true,
    memberId: typeof memberId === 'string' ? memberId : null,
  };
}

export async function findLinkedMember(
  clerkUserId: string,
): Promise<LinkedMemberRecord | null> {
  const record = await MemberModel.findOne({
    'account.clerkUserId': clerkUserId,
  }).lean<MemberRecord>();
  return isLinkedMember(record) ? record : null;
}

export async function findEditor(clerkUserId: string): Promise<Editor> {
  const member = await findLinkedMember(clerkUserId);
  if (!member) {
    throw new Error('The signed-in admin has no member record.');
  }
  return {
    name: `${member.firstName} ${member.lastName}`,
    number: member.number ?? null,
  };
}

export async function updateLinkedMember(
  clerkUserId: string,
  fields: Record<string, unknown>,
): Promise<LinkedMemberRecord | null> {
  const record = await MemberModel.findOneAndUpdate(
    { 'account.clerkUserId': clerkUserId },
    { $set: fields },
    { new: true },
  ).lean<MemberRecord>();
  return isLinkedMember(record) ? record : null;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

// Copies a Clerk photo into the app's own R2 bucket, so the avatar editor has a
// CORS-clean source to load
async function uploadClerkImage(clerkUserId: string, imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return uploadAvatar(clerkUserId, buffer, contentType);
}

// A webhook can describe a user the site has since deleted, so a new link is kept only
// once Clerk confirms the user still exists. Checking after the link is written means
// a later deletion sends its own user.deleted event to undo it, and any other failure
// drops the link so a retried webhook starts over
async function confirmLink(clerkUserId: string, memberId: string): Promise<boolean> {
  try {
    await clerkClient.users.getUser(clerkUserId);
    return true;
  } catch (error) {
    await MemberModel.updateOne(
      { _id: memberId, 'account.clerkUserId': clerkUserId },
      { $set: { account: null } },
    );
    if (isClerkAPIResponseError(error) && error.status === 404) {
      return false;
    }
    throw error;
  }
}

// Attaches a Clerk user to the member named in its public metadata. The
// user.created webhook and the auth middleware's fallback can race here: the
// filter only matches a member with no linked user and the unique index on the
// Clerk user id settles the rest, so whichever call lands second finds the link
// already made
export async function linkClerkUser(
  profile: ClerkProfile,
): Promise<LinkedMemberRecord | null> {
  const existing = await findLinkedMember(profile.id);
  if (existing || !profile.memberId || !Types.ObjectId.isValid(profile.memberId)) {
    return existing;
  }

  const account: MemberAccount = {
    clerkUserId: profile.id,
    isAdmin: profile.isAdmin,
    // Without a photo, Clerk reports a placeholder imageUrl; store null so it is
    // never mistaken for a real avatar
    clerkImageUrl: profile.hasImage ? profile.imageUrl : null,
    avatarUrl: null,
    avatarOriginalUrl: null,
    avatarManagedByApp: false,
    avatarCropState: null,
    avatarUpdatedAt: null,
  };

  let linkedNow = false;
  try {
    const result = await MemberModel.updateOne(
      { _id: profile.memberId, 'account.clerkUserId': null },
      { $set: { account, email: profile.email } },
    );
    linkedNow = result.modifiedCount === 1;
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  if (linkedNow && !(await confirmLink(profile.id, profile.memberId))) {
    return null;
  }

  // Only the call that made the link numbers the member, so a race never skips a number
  if (linkedNow) {
    await assignMemberNumber(profile.memberId);
  }

  if (linkedNow && profile.hasImage) {
    try {
      const url = await uploadClerkImage(profile.id, profile.imageUrl);
      await updateLinkedMember(profile.id, {
        'account.avatarUrl': url,
        'account.avatarOriginalUrl': url,
        'account.avatarUpdatedAt': new Date().toISOString(),
      });
    } catch {
      // The account still works without the R2 avatar
    }
  }

  return findLinkedMember(profile.id);
}

export async function syncClerkUser(profile: ClerkProfile): Promise<void> {
  const member = await findLinkedMember(profile.id);
  if (!member) {
    await linkClerkUser(profile);
    return;
  }

  const clerkImageUrl = profile.hasImage ? profile.imageUrl : null;
  const imageChanged = clerkImageUrl !== member.account.clerkImageUrl;

  // An active account's email is the Clerk login email
  const syncedFields = {
    email: profile.email,
    'account.isAdmin': profile.isAdmin,
    'account.clerkImageUrl': clerkImageUrl,
  };

  if (imageChanged && profile.hasImage && !member.account.avatarManagedByApp) {
    // Avatar was set via the Clerk dashboard (not the app), so sync it to R2
    try {
      const url = await uploadClerkImage(profile.id, profile.imageUrl);
      await updateLinkedMember(profile.id, {
        ...syncedFields,
        'account.avatarUrl': url,
        'account.avatarOriginalUrl': url,
        'account.avatarCropState': { zoom: 1, offsetX: 0, offsetY: 0 },
        'account.avatarUpdatedAt': new Date().toISOString(),
      });
    } catch {
      await updateLinkedMember(profile.id, syncedFields);
    }
  } else if (imageChanged && !profile.hasImage) {
    try {
      await deleteAvatar(profile.id);
    } catch {
      // avatar may not exist in R2
    }

    await updateLinkedMember(profile.id, {
      ...syncedFields,
      'account.avatarUrl': null,
      'account.avatarOriginalUrl': null,
      'account.avatarCropState': null,
      'account.avatarManagedByApp': false,
      'account.avatarUpdatedAt': new Date().toISOString(),
    });
  } else {
    await updateLinkedMember(profile.id, syncedFields);
  }
}

// The member record stays; only the account comes off it
export async function unlinkClerkUser(clerkUserId: string): Promise<void> {
  try {
    await deleteAvatar(clerkUserId);
  } catch {
    // avatar may not exist in R2
  }

  await MemberModel.updateOne(
    { 'account.clerkUserId': clerkUserId },
    { $set: { account: null } },
  );
}
