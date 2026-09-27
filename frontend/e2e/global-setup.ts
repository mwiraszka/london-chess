import { clerkSetup } from '@clerk/testing/playwright';

import { environment } from '../src/environments/environment';
import { MISSING_CREDENTIALS_REASON, adminCredentials } from './admin-credentials';

// Fetches the Clerk testing token that lets the signed-in specs past bot protection
export default async function globalSetup(): Promise<void> {
  if (!adminCredentials()) {
    // Skipping would let CI pass without ever signing in
    if (process.env['CI']) {
      throw new Error(MISSING_CREDENTIALS_REASON);
    }
    return;
  }

  await clerkSetup({ publishableKey: environment.clerkPublishableKey, dotenv: false });
}
