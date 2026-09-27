import { isAccountSection } from './is-account-section.util';

describe('isAccountSection', () => {
  it('accepts every account section id', () => {
    expect(isAccountSection('profile')).toBe(true);
    expect(isAccountSection('security')).toBe(true);
    expect(isAccountSection('danger')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isAccountSection(null)).toBe(false);
    expect(isAccountSection('')).toBe(false);
    expect(isAccountSection('Profile')).toBe(false);
    expect(isAccountSection('billing')).toBe(false);
  });
});
