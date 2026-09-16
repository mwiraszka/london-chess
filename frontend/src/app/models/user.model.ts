import { type AvatarEditorCropState } from '@eagami/ui';

import { Id } from './core.model';

export interface User {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
}

export interface UserRecord {
  id: string;
  memberNumber: number | null;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  clerkImageUrl: string | null;
  avatarUrl: string | null;
  avatarOriginalUrl: string | null;
  avatarCropState: AvatarEditorCropState | null;
  avatarUpdatedAt: string | null;
  hasTemporaryPassword: boolean;
  showYearOfBirth: boolean;
}

export interface UserSessionRecord {
  id: string;
  isCurrent: boolean;
  isMobile: boolean;
  browserName: string | null;
  deviceType: string | null;
  lastActiveAt: number;
}
