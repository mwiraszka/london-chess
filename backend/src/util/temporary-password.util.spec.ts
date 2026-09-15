import {
  generateTemporaryPassword,
  hashTemporaryPassword,
} from './temporary-password.util';

describe('generateTemporaryPassword', () => {
  it('should be 16 characters with a lowercase letter, an uppercase letter and a digit', () => {
    const password = generateTemporaryPassword();

    expect(password).toHaveLength(16);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/\d/);
  });

  it('should leave out characters that are easy to misread', () => {
    const passwords = Array.from({ length: 50 }, generateTemporaryPassword).join('');

    expect(passwords).not.toMatch(/[01ilIoO]/);
  });

  it('should differ between calls', () => {
    const first = generateTemporaryPassword();

    const second = generateTemporaryPassword();

    expect(first).not.toBe(second);
  });
});

describe('hashTemporaryPassword', () => {
  it('should recognise the same password without containing it', () => {
    const hash = hashTemporaryPassword('Temp4Pass');

    const sameHash = hashTemporaryPassword('Temp4Pass');
    const otherHash = hashTemporaryPassword('Temp4Pass2');

    expect(sameHash).toBe(hash);
    expect(otherHash).not.toBe(hash);
    expect(hash).not.toContain('Temp4Pass');
  });
});
