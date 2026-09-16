import {
  buildAccountRequestEmail,
  buildDetailsChangeRequestEmail,
  buildMemberChangesEmail,
  buildVerificationCodeEmail,
  buildWelcomeEmail,
} from './emails.util';
import { MemberChange } from './member-changes.util';

const LOGIN_URL = 'https://londonchess.ca/account';
const PROFILE_URL = 'https://londonchess.ca/members/7';

describe('buildWelcomeEmail', () => {
  it('should give the member their temporary password and link to the login page and their profile', () => {
    const email = buildWelcomeEmail(
      { firstName: 'Jane', email: 'jane@example.com' },
      'Temp4Pass',
      LOGIN_URL,
      PROFILE_URL,
    );

    expect(email.subject).toBe('Your London Chess account is ready');
    for (const body of [email.text, email.html]) {
      expect(body).toContain('Hi Jane,');
      expect(body).toContain('jane@example.com');
      expect(body).toContain('Temp4Pass');
      expect(body).toContain(PROFILE_URL);
    }
    expect(email.html).toContain(`<a href="${LOGIN_URL}">`);
    expect(email.html).toContain(`<a href="${PROFILE_URL}">`);
  });

  it('should escape member details in the HTML', () => {
    const email = buildWelcomeEmail(
      { firstName: '<b>Jane</b>', email: 'jane@example.com' },
      'Temp4Pass',
      LOGIN_URL,
      PROFILE_URL,
    );

    expect(email.html).toContain('&lt;b&gt;Jane&lt;/b&gt;');
    expect(email.html).not.toContain('<b>Jane</b>');
  });
});

describe('buildMemberChangesEmail', () => {
  const ratingChange: MemberChange = {
    field: 'rating',
    label: 'Rating',
    before: '1500',
    after: '1550',
  };
  const cityChange: MemberChange = {
    field: 'city',
    label: 'City',
    before: 'London',
    after: 'Toronto',
  };

  it('should use a rating subject when only ratings changed', () => {
    const email = buildMemberChangesEmail(
      { firstName: 'Jane' },
      [ratingChange],
      PROFILE_URL,
    );

    expect(email.subject).toBe('Your London Chess rating has been updated');
  });

  it('should use a details subject when anything else changed', () => {
    const email = buildMemberChangesEmail(
      { firstName: 'Jane' },
      [ratingChange, cityChange],
      PROFILE_URL,
    );

    expect(email.subject).toBe('Your London Chess member details have been updated');
  });

  it('should list each change with its previous and new value and link to the profile', () => {
    const email = buildMemberChangesEmail(
      { firstName: 'Jane' },
      [ratingChange, cityChange],
      PROFILE_URL,
    );

    expect(email.text).toContain('Rating: previous 1500, new 1550');
    expect(email.text).toContain('City: previous London, new Toronto');
    expect(email.text).toContain(PROFILE_URL);
    expect(email.html).toMatch(/<td[^>]*>1550<\/td>/);
    expect(email.html).toContain(`<a href="${PROFILE_URL}">`);
  });
});

describe('buildVerificationCodeEmail', () => {
  it('should give the reader their code', () => {
    const email = buildVerificationCodeEmail('123456');

    expect(email.subject).toBe('Your London Chess verification code');
    expect(email.text).toContain('123456');
    expect(email.html).toContain('123456');
  });
});

describe('buildDetailsChangeRequestEmail', () => {
  it('should name the member and list each requested change', () => {
    const email = buildDetailsChangeRequestEmail('Jane Doe', [
      { label: 'City', before: 'London', after: 'Toronto' },
    ]);

    expect(email.subject).toBe('Member details change request from Jane Doe');
    expect(email.text).toContain('Jane Doe has requested these changes');
    expect(email.text).toContain('City: current London, requested Toronto');
  });
});

describe('buildAccountRequestEmail', () => {
  it('should name the requester and list their details', () => {
    const email = buildAccountRequestEmail('Jane Doe', [
      ['Name', 'Jane Doe'],
      ['Email', 'jane@example.com'],
    ]);

    expect(email.subject).toBe('New account request from Jane Doe');
    expect(email.text).toContain('Name: Jane Doe\nEmail: jane@example.com');
  });
});
