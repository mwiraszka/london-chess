import { MongoMemoryReplSet } from 'mongodb-memory-server';
import nodemailer from 'nodemailer';

import { STORAGE_PORT, UNAVAILABLE_IMAGE } from './seed-data';

// Serves the API for the end-to-end suite against a throwaway database seeded on every
// start. Storage and email are faked in this process; Clerk is the development instance,
// used only to verify sessions and to find the test account to make an admin
const API_PORT = 3000;

const { CLERK_SECRET_KEY, E2E_ADMIN_EMAIL } = process.env;

async function findAdminClerkUserId(): Promise<string | null> {
  if (!E2E_ADMIN_EMAIL || !CLERK_SECRET_KEY) {
    console.warn('[e2e] No admin credentials set, so no member is linked to Clerk.');
    return null;
  }
  const { clerkClient } = await import('../src/services/clerk.service.js');
  const { data } = await clerkClient.users.getUserList({
    emailAddress: [E2E_ADMIN_EMAIL],
  });
  const user = data.find(({ emailAddresses }) =>
    emailAddresses.some(
      ({ emailAddress }) => emailAddress.toLowerCase() === E2E_ADMIN_EMAIL.toLowerCase(),
    ),
  );
  if (!user) {
    throw new Error(`No Clerk user has the email address ${E2E_ADMIN_EMAIL}.`);
  }
  return user.id;
}

async function main(): Promise<void> {
  // A replica set rather than a single server, since image uploads and bulk member
  // updates run in transactions
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

  // Set before any app module loads, since several read their settings on import
  Object.assign(process.env, {
    PORT: String(API_PORT),
    MONGODB_URI: replSet.getUri(),
    MONGODB_DATABASE: 'lcc-e2e',
    NODE_ENVIRONMENT: 'e2e',
    CLERK_SECRET_KEY: CLERK_SECRET_KEY ?? 'sk_test_e2e_without_clerk',
    // Nothing reaches the webhook, but the app refuses to start without a secret
    CLERK_WEBHOOK_SECRET: 'whsec_ZTJlLXdlYmhvb2stc2VjcmV0',
    R2_ACCOUNT_ID: 'e2e',
    R2_ACCESS_KEY_ID: 'e2e',
    R2_SECRET_ACCESS_KEY: 'e2e',
    R2_IMAGES_BUCKET_NAME: 'images',
    R2_AVATARS_BUCKET_NAME: 'avatars',
    R2_AVATARS_PUBLIC_URL: `http://localhost:${STORAGE_PORT}/avatars`,
    ZOHO_SMTP_USER: 'e2e',
    ZOHO_SMTP_PASSWORD: 'e2e',
    NOTIFY_EMAIL: 'admin@example.com',
  });
  delete process.env['SENTRY_DSN'];

  // Every message is rendered to JSON in memory instead of reaching the mail server
  const createTransport = nodemailer.createTransport.bind(nodemailer);
  Object.assign(nodemailer, {
    createTransport: () => createTransport({ jsonTransport: true }),
  });

  const { startFakeStorage, redirectStorageClient } = await import('./fake-storage.js');
  const { r2Client } = await import('../src/services/storage.service.js');
  await startFakeStorage(STORAGE_PORT);
  redirectStorageClient(r2Client(), STORAGE_PORT, new Set([UNAVAILABLE_IMAGE.id]));

  const { connectToDatabase } = await import('../src/services/mongo-db.service.js');
  const { seed } = await import('./seed.js');
  await connectToDatabase();
  await seed(await findAdminClerkUserId());

  const { app } = await import('../src/app.js');
  const server = app.listen(API_PORT, () =>
    console.log(`[e2e] API listening on port ${API_PORT} with seeded data.`),
  );

  const stop = async () => {
    server.close();
    await replSet.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch(error => {
  console.error('[e2e] Unable to start the API:', error);
  process.exit(1);
});
