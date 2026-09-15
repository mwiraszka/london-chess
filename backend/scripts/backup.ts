import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import mongoose from 'mongoose';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Copies the live database and storage buckets to a local directory, laid out
// for a person rather than a program. Safe to interrupt and re-run: files
// already on disk at full size are skipped.
const required = [
  'MONGODB_URI',
  'R2_ACCOUNT_ID',
  'MONGODB_DATABASE_PROD',
  'R2_ACCESS_KEY_ID_PROD',
  'R2_SECRET_ACCESS_KEY_PROD',
  'R2_AVATARS_BUCKET_NAME_PROD',
  'R2_IMAGES_BUCKET_NAME_PROD',
] as const;

const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Missing ${missing.join(', ')}`);
  process.exit(1);
}

const env = (name: string): string => process.env[name] as string;

const database = env('MONGODB_DATABASE_PROD');
const avatarsBucket = env('R2_AVATARS_BUCKET_NAME_PROD');
const imagesBucket = env('R2_IMAGES_BUCKET_NAME_PROD');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env('R2_ACCESS_KEY_ID_PROD'),
    secretAccessKey: env('R2_SECRET_ACCESS_KEY_PROD'),
  },
});

const takenAt = new Date().toISOString();
const day = takenAt.slice(0, 10);

const destination =
  process.argv[2] ?? join(homedir(), 'Downloads', `london-chess-backup-${day}`);
const root = resolve(destination);

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

function sanitize(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '-').replace(/^[. ]+|[. ]+$/g, '');
}

const short = (id: string) => id.slice(-8);

interface StoredObject {
  key: string;
  size: number;
}

async function listBucket(bucket: string): Promise<StoredObject[]> {
  const objects: StoredObject[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    for (const object of page.Contents ?? []) {
      if (object.Key && object.Size !== undefined) {
        objects.push({ key: object.Key, size: object.Size });
      }
    }
    token = page.NextContinuationToken;
  } while (token);
  return objects;
}

async function download(bucket: string, key: string, target: string): Promise<void> {
  await mkdir(dirname(target), { recursive: true });

  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

  // Written beside its name and moved over it once whole, so a copy cut off
  // mid-file is never mistaken for a finished one on the next run
  const partial = `${target}.partial`;
  await pipeline(response.Body as Readable, createWriteStream(partial));
  await rename(partial, target);
}

async function alreadyPresent(target: string, size: number): Promise<boolean> {
  const existing = await stat(target).catch(() => null);
  return existing !== null && existing.size === size;
}

interface ImageRecord {
  _id: { toString(): string };
  filename?: string;
  album?: string;
}

interface UserRecord {
  id?: string;
  firstName?: string;
  lastName?: string;
}

async function main(): Promise<void> {
  await mkdir(join(root, 'database'), { recursive: true });

  await mongoose.connect(env('MONGODB_URI'), { dbName: database });
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('No database handle after connecting.');
  }

  const images = (await db.collection('images').find().toArray()) as ImageRecord[];
  const users = (await db.collection('users').find().toArray()) as UserRecord[];

  // Names are settled for the whole library before anything downloads, so a
  // file name used twice within an album gets an id suffix on every holder
  const photoPaths = new Map<string, string>();
  {
    const taken = new Map<string, number>();
    for (const image of images) {
      const base = join(
        sanitize(image.album ?? '') || 'No album',
        sanitize(image.filename ?? '') || short(image._id.toString()),
      );
      taken.set(base, (taken.get(base) ?? 0) + 1);
    }
    for (const image of images) {
      const id = image._id.toString();
      const album = sanitize(image.album ?? '') || 'No album';
      const file = sanitize(image.filename ?? '') || short(id);
      const base = join(album, file);
      if ((taken.get(base) ?? 0) > 1) {
        const dot = file.lastIndexOf('.');
        const suffixed =
          dot > 0
            ? `${file.slice(0, dot)} (${short(id)})${file.slice(dot)}`
            : `${file} (${short(id)})`;
        photoPaths.set(id, join('photos', album, suffixed));
      } else {
        photoPaths.set(id, join('photos', base));
      }
    }
  }

  const userDirs = new Map<string, string>();
  for (const user of users) {
    if (user.id) {
      const name = sanitize(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim());
      userDirs.set(user.id, name || user.id);
    }
  }

  const collections = (await db.listCollections().toArray())
    .map(collection => collection.name)
    .filter(name => !name.startsWith('system.'))
    .sort();

  for (const name of collections) {
    const documents = (await db.collection(name).find().toArray()).map(document => ({
      ...document,
      _id: String(document._id),
    }));
    const extras = name === 'images' ? { files: Object.fromEntries(photoPaths) } : {};
    await writeFile(
      join(root, 'database', `${name}.json`),
      JSON.stringify({ takenAt, count: documents.length, ...extras, documents }, null, 2),
    );
    console.warn(`database/${name}.json written (${documents.length} records)`);
  }

  await mongoose.disconnect();

  let copied = 0;
  let skipped = 0;
  let unmatched = 0;

  const imageIds = new Set(images.map(image => image._id.toString()));
  const extensionFor = (id: string): string => {
    const file = photoPaths.get(id) ?? '';
    const dot = file.lastIndexOf('.');
    return dot > 0 ? file.slice(dot) : '';
  };

  for (const object of await listBucket(imagesBucket)) {
    const isThumbnail = object.key.endsWith('-thumb');
    const id = isThumbnail ? object.key.slice(0, -'-thumb'.length) : object.key;

    let target: string;
    if (!imageIds.has(id)) {
      target = join(root, 'unsorted', 'images', object.key);
      unmatched++;
    } else if (isThumbnail) {
      target = join(root, 'thumbnails', `${id}${extensionFor(id)}`);
    } else {
      target = join(root, photoPaths.get(id) as string);
    }

    if (await alreadyPresent(target, object.size)) {
      skipped++;
      continue;
    }
    await download(imagesBucket, object.key, target);
    copied++;
    if (copied % 25 === 0) {
      console.warn(`  ${copied} copied, ${skipped} already present...`);
    }
  }

  for (const object of await listBucket(avatarsBucket)) {
    const [prefix, userId, variant] = object.key.split('/');
    const dir = prefix === 'avatars' && userId ? userDirs.get(userId) : undefined;

    let target: string;
    if (!dir || !variant) {
      target = join(root, 'unsorted', 'avatars', object.key);
      unmatched++;
    } else {
      const head = await client.send(
        new HeadObjectCommand({ Bucket: avatarsBucket, Key: object.key }),
      );
      const extension = EXTENSIONS[head.ContentType ?? ''] ?? '.jpg';
      target = join(root, 'avatars', dir, `${variant}${extension}`);
    }

    if (await alreadyPresent(target, object.size)) {
      skipped++;
      continue;
    }
    await download(avatarsBucket, object.key, target);
    copied++;
  }

  const readme = `# London Chess Club backup (${day})

This folder is a complete copy of everything the London Chess Club website
stores: the database records and every uploaded photo, made on ${day}.

## What is in here

| Folder      | What it holds                                                       |
| ----------- | ------------------------------------------------------------------- |
| photos/     | Every photo gallery picture, in a folder per album, under its       |
|             | original file name. Full-size originals: open, copy, or print them  |
|             | like any other picture files.                                       |
| avatars/    | Members' profile pictures, one folder per person. "original" is the |
|             | photo they uploaded, "cropped" is the version shown on the site.    |
| database/   | The website's records (articles, events, members, images, users),   |
|             | one plain-text JSON file per category, openable in any text editor. |
| thumbnails/ | Small preview versions of the gallery photos, used by the website   |
|             | for faster loading. Kept so the site can be restored exactly.       |
| unsorted/   | Anything in photo storage that no record points to. Usually empty.  |

## Where each part of the website normally lives

| Part                    | Where it lives                                  |
| ----------------------- | ----------------------------------------------- |
| The website and its API | Vercel, serving londonchess.ca                  |
| Source code             | github.com/mwiraszka/london-chess               |
| Records (database)      | MongoDB Atlas cluster                           |
| Photos and avatars      | Cloudflare R2 storage buckets                   |
| Weekly backup copies    | Backblaze B2, encrypted; reading them requires  |
|                         | the backup passphrase from the password manager |

## Restoring the website

Everything the website needs is in this folder. The database/ files hold all
the records, and database/images.json includes a list ("files") saying exactly
which photo on disk belongs to which record, so a developer can rebuild the
website's storage from this folder alone.
`;

  await writeFile(join(root, 'README.md'), readme);

  if (unmatched) {
    console.warn(`${unmatched} object(s) matched no database record; see unsorted/`);
  }
  console.warn(`Done: ${copied} copied, ${skipped} already present, in ${root}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
