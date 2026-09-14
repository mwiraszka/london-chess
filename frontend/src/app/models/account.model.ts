import { ACCOUNT_SECTIONS } from '@app/constants/account';

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number]['id'];

export interface SessionInfo {
  id: string;
  isCurrent: boolean;
  isMobile: boolean;
  device: string;
  lastActive: string;
}
