import { createHash } from 'node:crypto';

// What is hashed is random or short-lived, so a fast hash is enough to recognise it later
// without keeping it
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}
