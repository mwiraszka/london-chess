import { ACCOUNT_SECTIONS } from '@app/constants/account';
import { AccountSection } from '@app/models';

export function isAccountSection(value: string | null): value is AccountSection {
  return ACCOUNT_SECTIONS.some(section => section.id === value);
}
