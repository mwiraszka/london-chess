import { VERIFICATION_CODE_LENGTH } from '@app/constants/auth';

import { createVerificationCodeControl } from './create-verification-code-control.util';

describe('createVerificationCodeControl', () => {
  it('requires a code', () => {
    const control = createVerificationCodeControl();

    expect(control.hasError('required')).toBe(true);
  });

  it('accepts a code of exactly the verification code length', () => {
    const control = createVerificationCodeControl();

    control.setValue('1'.repeat(VERIFICATION_CODE_LENGTH));

    expect(control.valid).toBe(true);
  });

  it('rejects a code that is too short or too long', () => {
    const control = createVerificationCodeControl();

    control.setValue('1'.repeat(VERIFICATION_CODE_LENGTH - 1));
    const tooShort = control.hasError('minlength');
    control.setValue('1'.repeat(VERIFICATION_CODE_LENGTH + 1));
    const tooLong = control.hasError('maxlength');

    expect(tooShort).toBe(true);
    expect(tooLong).toBe(true);
  });

  it('resets back to an empty string', () => {
    const control = createVerificationCodeControl();
    control.setValue('123456');

    control.reset();

    expect(control.value).toBe('');
  });
});
