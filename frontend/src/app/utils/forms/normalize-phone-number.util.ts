import { MEMBER_DETAIL_RULES } from '@app/constants/member-details';

// Every accepted format ends in the same ten digits, after an optional +1 or 001
export function normalizePhoneNumber(value: string): string {
  if (!MEMBER_DETAIL_RULES.phoneNumber.pattern.test(value)) {
    return value;
  }

  const digits = value.replace(/\D/g, '').slice(-10);
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
