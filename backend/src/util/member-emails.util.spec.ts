import { MemberChange } from './member-changes.util';
import { buildMemberChangesEmail, buildWelcomeEmail } from './member-emails.util';

const SITE_URL = 'https://londonchess.ca';
const PROFILE_URL = 'https://londonchess.ca/members/7';

describe('buildWelcomeEmail', () => {
  it('should give the member their temporary password and link to the site and their profile', () => {
    const email = buildWelcomeEmail(
      { firstName: 'Jane', email: 'jane@example.com' },
      'Temp4Pass',
      SITE_URL,
      PROFILE_URL,
    );

    expect(email.subject).toBe('Your London Chess account is ready');
    for (const body of [email.text, email.html]) {
      expect(body).toContain('Hi Jane,');
      expect(body).toContain('jane@example.com');
      expect(body).toContain('Temp4Pass');
      expect(body).toContain(PROFILE_URL);
    }
    expect(email.html).toContain(`<a href="${SITE_URL}">`);
    expect(email.html).toContain(`<a href="${PROFILE_URL}">`);
  });

  it('should escape member details in the HTML', () => {
    const email = buildWelcomeEmail(
      { firstName: '<b>Jane</b>', email: 'jane@example.com' },
      'Temp4Pass',
      SITE_URL,
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

    expect(email.text).toContain('Rating: 1550 (previously 1500)');
    expect(email.text).toContain('City: Toronto (previously London)');
    expect(email.text).toContain(PROFILE_URL);
    expect(email.html).toContain('<td style="padding: 6px 0;">1550</td>');
    expect(email.html).toContain(`<a href="${PROFILE_URL}">`);
  });
});
