import { createNewPasswordGroup } from './create-new-password-group.util';

describe('createNewPasswordGroup', () => {
  it('starts empty and invalid', () => {
    const group = createNewPasswordGroup();

    expect(group.getRawValue()).toEqual({ newPassword: '', confirmPassword: '' });
    expect(group.valid).toBe(false);
  });

  it('rejects a weak password', () => {
    const group = createNewPasswordGroup();

    group.setValue({ newPassword: 'weak', confirmPassword: 'weak' });

    expect(group.controls.newPassword.hasError('weakPassword')).toBe(true);
  });

  it('rejects a confirmation that does not match', () => {
    const group = createNewPasswordGroup();

    group.setValue({ newPassword: 'Secret#123', confirmPassword: 'Secret#124' });

    expect(group.hasError('passwordMismatch')).toBe(true);
  });

  it('accepts a strong, confirmed password', () => {
    const group = createNewPasswordGroup();

    group.setValue({ newPassword: 'Secret#123', confirmPassword: 'Secret#123' });

    expect(group.valid).toBe(true);
  });

  it('resets back to empty strings', () => {
    const group = createNewPasswordGroup();
    group.setValue({ newPassword: 'Secret#123', confirmPassword: 'Secret#123' });

    group.reset();

    expect(group.getRawValue()).toEqual({ newPassword: '', confirmPassword: '' });
  });
});
