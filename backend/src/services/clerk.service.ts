import { createClerkClient } from '@clerk/backend';

const { CLERK_SECRET_KEY } = process.env;
if (!CLERK_SECRET_KEY) {
  throw new Error('Unable to parse Clerk environment variables.');
}

export const clerkSecretKey = CLERK_SECRET_KEY;

export const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });
