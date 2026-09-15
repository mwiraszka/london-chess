import { EditableMemberFields } from '../models/member.model';

type ChangeableField = Exclude<keyof EditableMemberFields, 'modificationInfo'>;

export interface MemberChange {
  field: ChangeableField;
  label: string;
  before: string;
  after: string;
}

// In the order the member editor shows them
const FIELD_LABELS: Record<ChangeableField, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  city: 'City',
  rating: 'Rating',
  peakRating: 'Peak rating',
  dateJoined: 'Date joined',
  email: 'Email',
  phoneNumber: 'Phone number',
  yearOfBirth: 'Year of birth',
  chessComUsername: 'Chess.com username',
  lichessUsername: 'Lichess username',
  isActive: 'Active member',
};

export const RATING_FIELDS: readonly ChangeableField[] = ['rating', 'peakRating'];

export function describeMemberChanges(
  before: Partial<Pick<EditableMemberFields, ChangeableField>>,
  after: Pick<EditableMemberFields, ChangeableField>,
  fields: readonly ChangeableField[] = Object.keys(FIELD_LABELS) as ChangeableField[],
): MemberChange[] {
  return fields.flatMap(field => {
    const previous = formatValue(field, before[field]);
    const next = formatValue(field, after[field]);
    return previous === next
      ? []
      : [{ field, label: FIELD_LABELS[field], before: previous, after: next }];
  });
}

export function isRatingChangeOnly(changes: MemberChange[]): boolean {
  return changes.every(change => RATING_FIELDS.includes(change.field));
}

function formatValue(
  field: ChangeableField,
  value: string | boolean | undefined,
): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (!value?.trim()) {
    return 'None';
  }
  return field === 'dateJoined' ? formatDate(value) : value.trim();
}

// Join dates are stored as instants, so two on the same club day read as one date
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
