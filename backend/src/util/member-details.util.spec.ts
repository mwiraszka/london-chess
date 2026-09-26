import { isValidYearOfBirth, validateDetailField } from './member-details.util';

describe('validateDetailField', () => {
  it('should require only the required fields', () => {
    expect(validateDetailField('firstName', '')).toBe('First name is required.');
    expect(validateDetailField('city', '')).toBe('City is required.');
    expect(validateDetailField('phoneNumber', '')).toBeNull();
  });

  it('should limit the length of names and cities', () => {
    const long = 'x'.repeat(51);

    expect(validateDetailField('lastName', long)).toBe(
      'Names must be 50 characters or fewer.',
    );
    expect(validateDetailField('city', long)).toBe(
      'City must be 50 characters or fewer.',
    );
    expect(validateDetailField('lastName', 'x'.repeat(50))).toBeNull();
  });

  it('should need a four-digit year of birth', () => {
    expect(validateDetailField('yearOfBirth', '90')).toBe(
      'Year of birth must be a four-digit year.',
    );
    expect(validateDetailField('yearOfBirth', '1990')).toBeNull();
  });

  it('should check phone numbers and usernames against their patterns', () => {
    expect(validateDetailField('phoneNumber', '(519) 555-0100')).toBeNull();
    expect(validateDetailField('phoneNumber', 'call me')).toMatch(
      /^Phone number must be/,
    );
    expect(validateDetailField('chessComUsername', 'ab')).toMatch(
      /^Chess.com username must be/,
    );
    expect(validateDetailField('lichessUsername', 'jane_doe-1')).toBeNull();
  });
});

describe('isValidYearOfBirth', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should accept whole years from 1900 up to the current year', () => {
    expect(isValidYearOfBirth(1900)).toBe(true);
    expect(isValidYearOfBirth(2026)).toBe(true);
    expect(isValidYearOfBirth(2027)).toBe(false);
    expect(isValidYearOfBirth(1899)).toBe(false);
    expect(isValidYearOfBirth(1990.5)).toBe(false);
    expect(isValidYearOfBirth('1990')).toBe(false);
  });
});
