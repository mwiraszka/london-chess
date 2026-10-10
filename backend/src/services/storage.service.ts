import { S3Client } from '@aws-sdk/client-s3';

let client: S3Client | undefined;

// Resolved lazily so the app can boot (and non-storage features work) before
// the R2 credentials are configured.
export function r2Client(): S3Client {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Unable to parse R2 environment variables.');
  }

  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    // Inside Vercel's 30 s function limit, so a stalled upload answers with an error
    // before the platform cuts the request off
    requestHandler: {
      requestTimeout: 20000,
    },
  });
  return client;
}

export function imagesBucket(): string {
  const { R2_IMAGES_BUCKET_NAME } = process.env;
  if (!R2_IMAGES_BUCKET_NAME) {
    throw new Error('Unable to parse R2 environment variables.');
  }
  return R2_IMAGES_BUCKET_NAME;
}
