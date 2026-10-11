import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import mongoose from 'mongoose';

import { CURRENT_DATASET_ID, DatasetModel } from '../src/models/dataset.model';

// Replaces the development database with a copy of production's, keeping contact
// details only for the members listed below, and copies any photos the development
// bucket is missing. Production is only ever read.
const required = [
  'MONGODB_URI',
  'MONGODB_DATABASE',
  'MONGODB_DATABASE_PROD',
  'R2_ACCOUNT_ID',
  'R2_IMAGES_BUCKET_NAME',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_IMAGES_BUCKET_NAME_PROD',
  'R2_ACCESS_KEY_ID_PROD',
  'R2_SECRET_ACCESS_KEY_PROD',
] as const;

const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Missing ${missing.join(', ')}`);
  process.exit(1);
}

const env = (name: (typeof required)[number]): string => process.env[name] as string;

if (env('MONGODB_DATABASE') === env('MONGODB_DATABASE_PROD')) {
  console.error('MONGODB_DATABASE names the production database');
  process.exit(1);
}
if (env('R2_IMAGES_BUCKET_NAME') === env('R2_IMAGES_BUCKET_NAME_PROD')) {
  console.error('R2_IMAGES_BUCKET_NAME names the production bucket');
  process.exit(1);
}

const MEMBERS_WITH_CONTACT_DETAILS = new Set([0, 1, 2, 3]);

// Pending sign-up codes, keyed by email and gone within the hour
const SKIPPED_COLLECTIONS = new Set(['accountverifications']);

type Db = NonNullable<mongoose.Connection['db']>;

interface MemberDocument {
  _id: mongoose.Types.ObjectId;
  number?: number;
  email?: string;
  phoneNumber?: string;
  account?: { clerkUserId: string } | null;
}

function r2Client(accessKeyId: string, secretAccessKey: string): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function listKeys(client: S3Client, bucket: string): Promise<Set<string>> {
  const keys = new Set<string>();
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    for (const object of page.Contents ?? []) {
      if (object.Key) {
        keys.add(object.Key);
      }
    }
    token = page.NextContinuationToken;
  } while (token);
  return keys;
}

// Clerk user ids belong to one Clerk instance, so a member linked in both keeps the
// development account, or its owner could no longer log in to development. Accounts
// linked only in development are dropped, since production's member numbers win, and
// the auth middleware links them again on their next login.
async function prepareMembers(prod: Db, dev: Db): Promise<MemberDocument[]> {
  const devAccounts = new Map(
    (
      await dev
        .collection<MemberDocument>('members')
        .find({ 'account.clerkUserId': { $type: 'string' } })
        .toArray()
    ).map(member => [member._id.toString(), member.account]),
  );

  const members = await prod.collection<MemberDocument>('members').find().toArray();
  return members.map(member => {
    const devAccount = devAccounts.get(member._id.toString());
    const keepsContactDetails =
      member.number !== undefined && MEMBERS_WITH_CONTACT_DETAILS.has(member.number);
    return {
      ...member,
      ...(keepsContactDetails ? {} : { email: '', phoneNumber: '' }),
      ...(member.account && devAccount ? { account: devAccount } : {}),
    };
  });
}

async function syncDatabase(prod: Db, dev: Db): Promise<string[]> {
  const collections = (await prod.listCollections().toArray())
    .map(collection => collection.name)
    .filter(name => !name.startsWith('system.') && !SKIPPED_COLLECTIONS.has(name))
    .sort();

  for (const name of collections) {
    const documents =
      name === 'members'
        ? await prepareMembers(prod, dev)
        : await prod.collection(name).find().toArray();

    // Emptied rather than dropped, so development keeps its indexes
    await dev.collection(name).deleteMany({});
    if (documents.length) {
      await dev.collection(name).insertMany(documents);
    }
    console.warn(`${name}: ${documents.length} records copied`);
  }

  const imageIds = await prod
    .collection('images')
    .find({}, { projection: { _id: 1 } })
    .toArray();
  return imageIds.map(({ _id }) => _id.toString());
}

async function syncImages(imageIds: string[]): Promise<void> {
  const prodBucket = env('R2_IMAGES_BUCKET_NAME_PROD');
  const devBucket = env('R2_IMAGES_BUCKET_NAME');
  const prodClient = r2Client(
    env('R2_ACCESS_KEY_ID_PROD'),
    env('R2_SECRET_ACCESS_KEY_PROD'),
  );
  const devClient = r2Client(env('R2_ACCESS_KEY_ID'), env('R2_SECRET_ACCESS_KEY'));

  const present = await listKeys(devClient, devBucket);
  const missingKeys = imageIds
    .flatMap(id => [id, `${id}-thumb`])
    .filter(key => !present.has(key));

  for (const key of missingKeys) {
    const object = await prodClient.send(
      new GetObjectCommand({ Bucket: prodBucket, Key: key }),
    );
    if (!object.Body) {
      throw new Error(`Photo ${key} came back empty.`);
    }
    await devClient.send(
      new PutObjectCommand({
        Bucket: devBucket,
        Key: key,
        Body: await object.Body.transformToByteArray(),
        ContentType: object.ContentType,
      }),
    );
  }
  console.warn(`photos: ${missingKeys.length} copied`);
}

async function main(): Promise<void> {
  const connection = await mongoose.createConnection(env('MONGODB_URI')).asPromise();
  const prod = connection.useDb(env('MONGODB_DATABASE_PROD')).db;
  const dev = connection.useDb(env('MONGODB_DATABASE')).db;
  if (!prod || !dev) {
    throw new Error('No database handle after connecting.');
  }

  const imageIds = await syncDatabase(prod, dev);
  // Development and preview browsers drop the records they saved before this replacement
  await dev
    .collection<{ _id: string; replacedAt: string }>(DatasetModel.collection.name)
    .replaceOne(
      { _id: CURRENT_DATASET_ID },
      { replacedAt: new Date().toISOString() },
      { upsert: true },
    );
  await connection.close();

  await syncImages(imageIds);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
