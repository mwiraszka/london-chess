export interface PasswordChecks {
  length: boolean;
  cases: boolean;
  number: boolean;
  special: boolean;
}

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    cases: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function meetsPasswordRequirements(password: string): boolean {
  return Object.values(getPasswordChecks(password)).every(Boolean);
}
