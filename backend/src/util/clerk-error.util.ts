type ClerkError = { errors?: Array<{ code?: string; longMessage?: string }> };

export function clerkErrorCode(error: unknown): string | undefined {
  return (error as ClerkError).errors?.[0]?.code;
}

export function clerkErrorMessage(error: unknown, fallback: string): string {
  const message = (error as ClerkError).errors?.[0]?.longMessage ?? fallback;
  return /[.!?]$/.test(message) ? message : `${message}.`;
}
