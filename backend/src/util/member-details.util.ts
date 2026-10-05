const MIN_YEAR_OF_BIRTH = 1900;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MEMBER_DETAIL_RULES = {
  phoneNumber: {
    pattern: /^(?:(?:\+1|001) ?)?(?:\d{3}-\d{3}-\d{4}|\d{10}|\(\d{3}\) \d{3}[- ]?\d{4})$/,
    message: 'Please enter a valid phone number.',
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

export const DETAIL_FIELDS = {
  firstName: 'First name',
  lastName: 'Last name',
  yearOfBirth: 'Year of birth',
  city: 'City',
  phoneNumber: 'Phone number',
  lichessUsername: 'Lichess username',
  chessComUsername: 'Chess.com username',
} as const;

export type DetailField = keyof typeof DETAIL_FIELDS;

const REQUIRED_DETAIL_FIELDS: readonly DetailField[] = [
  'firstName',
  'lastName',
  'yearOfBirth',
  'city',
];

export function validateDetailField(field: DetailField, value: string): string | null {
  if (!value) {
    return REQUIRED_DETAIL_FIELDS.includes(field)
      ? `${DETAIL_FIELDS[field]} is required.`
      : null;
  }
  if (field === 'yearOfBirth' && !isYearOfBirth(value)) {
    return `Year of birth must be a year from ${MIN_YEAR_OF_BIRTH} to ${new Date().getFullYear()}.`;
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

function isYearOfBirth(value: string): boolean {
  const year = Number(value);
  return (
    /^\d{4}$/.test(value) && year >= MIN_YEAR_OF_BIRTH && year <= new Date().getFullYear()
  );
}
