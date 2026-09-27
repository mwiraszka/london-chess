export interface AdminCredentials {
  email: string;
  password: string;
}

export const MISSING_CREDENTIALS_REASON =
  'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and CLERK_SECRET_KEY to run the signed-in specs.';

export function adminCredentials(): AdminCredentials | null {
  const { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, CLERK_SECRET_KEY } = process.env;
  return E2E_ADMIN_EMAIL && E2E_ADMIN_PASSWORD && CLERK_SECRET_KEY
    ? { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD }
    : null;
}
