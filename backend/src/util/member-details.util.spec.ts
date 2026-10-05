import { validateDetailField } from './member-details.util';

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

  it('should need a year of birth from 1900 up to the current year', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-26T12:00:00.000Z'));
    const message = 'Year of birth must be a year from 1900 to 2026.';

    expect(validateDetailField('yearOfBirth', '90')).toBe(message);
    expect(validateDetailField('yearOfBirth', '1899')).toBe(message);
    expect(validateDetailField('yearOfBirth', '2027')).toBe(message);
    expect(validateDetailField('yearOfBirth', '1900')).toBeNull();
    expect(validateDetailField('yearOfBirth', '2026')).toBeNull();
  });

  it('should check phone numbers and usernames against their patterns', () => {
    expect(validateDetailField('phoneNumber', '(519) 555-0100')).toBeNull();
    expect(validateDetailField('phoneNumber', 'call me')).toBe(
      'Please enter a valid phone number.',
    );
    expect(validateDetailField('chessComUsername', 'ab')).toMatch(
      /^Chess.com username must be/,
    );
    expect(validateDetailField('lichessUsername', 'jane_doe-1')).toBeNull();
  });
});
