import { createClerkClient } from '@clerk/backend';
import mongoose from 'mongoose';

import { CounterModel, MEMBER_NUMBER_COUNTER_ID } from '../src/models/counter.model';
import { MemberAccount, MemberModel, MemberRecord } from '../src/models/member.model';

// Gives the reserved members their numbers (everyone else is numbered when their
// account becomes active), credits editors by member number on existing records,
// and with --link-accounts moves each Clerk account in the retired users
// collection onto its member record and gives every linked Clerk account its member
// id in public metadata. Safe to re-run: members that already have a number or a
// linked account, accounts that already carry their member id, and records already
// credited, are left alone.
//
//   pnpm migrate:members --database <name> [--link-accounts] [--dry-run]

interface RetiredUserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  clerkImageUrl: string | null;
  avatarUrl: string | null;
  avatarOriginalUrl: string | null;
  avatarManagedByApp: boolean;
  avatarCropState: MemberAccount['avatarCropState'];
  lastModifiedDate?: Date;
}

type ClerkClient = ReturnType<typeof createClerkClient>;

const RESERVED_NUMBERS: ReadonlyArray<[number, string, string]> = [
  [0, 'Michal', 'Wiraszka'],
  [1, 'Ryan', 'Sarson'],
  [2, 'Gerry', 'Litchfield'],
  [3, 'Hardik', 'Shrestha'],
];

const EDITED_COLLECTIONS = ['articles', 'events', 'images', 'members'];

const EDITOR_FIELDS = [
  ['createdBy', 'createdByNumber'],
  ['lastEditedBy', 'lastEditedByNumber'],
] as const;

const args = process.argv.slice(2);
const databaseIndex = args.indexOf('--database');
const database = databaseIndex === -1 ? undefined : args[databaseIndex + 1];
const linkAccounts = args.includes('--link-accounts');
const dryRun = args.includes('--dry-run');

const { MONGODB_URI, MONGODB_DATABASE_PROD, CLERK_SECRET_KEY } = process.env;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findOneByName(firstName: string, lastName: string): Promise<MemberRecord> {
  const matches = await MemberModel.find({
    firstName: new RegExp(`^${escapeRegex(firstName)}$`, 'i'),
    lastName: new RegExp(`^${escapeRegex(lastName)}$`, 'i'),
  }).lean<MemberRecord[]>();

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one member named ${firstName} ${lastName}, found ${matches.length}.`,
    );
  }
  return matches[0];
}

// Resolves to every numbered member's number, keyed by their full name
async function assignReservedNumbers(): Promise<Map<string, number>> {
  const numbered = await MemberModel.find(
    { number: { $exists: true } },
    { number: 1, firstName: 1, lastName: 1 },
  ).lean<MemberRecord[]>();
  const numberByName = new Map<string, number>();
  for (const member of numbered) {
    if (typeof member.number === 'number') {
      numberByName.set(`${member.firstName} ${member.lastName}`, member.number);
    }
  }
  const takenNumbers = new Set(
    numbered.flatMap(member => (typeof member.number === 'number' ? [member.number] : [])),
  );
  const assignments: Array<{
    id: mongoose.Types.ObjectId;
    name: string;
    number: number;
  }> = [];

  for (const [number, firstName, lastName] of RESERVED_NUMBERS) {
    const member = await findOneByName(firstName, lastName);
    if (typeof member.number === 'number') {
      if (member.number !== number) {
        throw new Error(
          `${firstName} ${lastName} already has number ${member.number}, not ${number}.`,
        );
      }
      continue;
    }
    if (takenNumbers.has(number)) {
      throw new Error(`Number ${number} already belongs to another member.`);
    }
    const name = `${member.firstName} ${member.lastName}`;
    assignments.push({ id: member._id, name, number });
    numberByName.set(name, number);
    takenNumbers.add(number);
  }

  console.log(`Numbering ${assignments.length} member(s).`);
  for (const assignment of assignments) {
    console.log(`  ${assignment.number}: ${assignment.name}`);
  }

  const counterNext = Math.max(-1, ...takenNumbers) + 1;
  console.log(`Member number counter will hand out ${counterNext} next.`);

  if (!dryRun) {
    if (assignments.length) {
      await MemberModel.bulkWrite(
        assignments.map(assignment => ({
          updateOne: {
            filter: { _id: assignment.id, number: { $exists: false } },
            update: { $set: { number: assignment.number } },
          },
        })),
      );
    }

    await CounterModel.updateOne(
      { _id: MEMBER_NUMBER_COUNTER_ID },
      { $max: { next: counterNext } },
      { upsert: true },
    );
    await MemberModel.createIndexes();
  }

  return numberByName;
}

// Records saved before editors were credited by number only name them, so each
// name is matched once against the numbered members
async function creditEditorsByNumber(numberByName: Map<string, number>): Promise<void> {
  console.log('Crediting editors by member number.');

  for (const collectionName of EDITED_COLLECTIONS) {
    const collection = mongoose.connection.collection(collectionName);

    for (const [nameField, numberField] of EDITOR_FIELDS) {
      // A null number was left by an earlier run that found no match, so a member
      // reserved since then is still credited
      const uncredited = {
        modificationInfo: { $exists: true },
        [`modificationInfo.${numberField}`]: null,
      };

      let credited = 0;
      for (const [name, number] of numberByName) {
        const filter = { ...uncredited, [`modificationInfo.${nameField}`]: name };
        credited += await collection.countDocuments(filter);
        if (!dryRun) {
          await collection.updateMany(filter, {
            $set: { [`modificationInfo.${numberField}`]: number },
          });
        }
      }

      const remaining = await collection.countDocuments(uncredited);
      const unmatched = dryRun ? remaining - credited : remaining;
      console.log(
        `  ${collectionName} ${nameField}: ${credited} credited, ${unmatched} left as name only`,
      );

      if (!dryRun) {
        await collection.updateMany(uncredited, {
          $set: { [`modificationInfo.${numberField}`]: null },
        });
      }
    }
  }
}

async function linkRetiredAccounts(clerkClient: ClerkClient): Promise<void> {
  const users = await mongoose.connection
    .collection<RetiredUserRecord>('users')
    .find({ id: /^user_/ })
    .toArray();

  console.log(`Linking ${users.length} Clerk account(s).`);

  for (const user of users) {
    const member = await findOneByName(user.firstName, user.lastName);
    if (member.account?.clerkUserId === user.id) {
      console.log(`  ${user.firstName} ${user.lastName}: already linked`);
      continue;
    }
    if (member.account) {
      throw new Error(
        `${user.firstName} ${user.lastName} already has a different account on their member record.`,
      );
    }

    const account: MemberAccount = {
      clerkUserId: user.id,
      isAdmin: user.isAdmin,
      clerkImageUrl: user.clerkImageUrl,
      avatarUrl: user.avatarUrl,
      avatarOriginalUrl: user.avatarOriginalUrl,
      avatarManagedByApp: user.avatarManagedByApp,
      avatarCropState: user.avatarCropState,
      avatarUpdatedAt: user.lastModifiedDate?.toISOString() ?? null,
      temporaryPasswordHash: null,
    };

    console.log(`  ${user.firstName} ${user.lastName}: member #${member.number}`);
    if (dryRun) {
      continue;
    }

    await MemberModel.updateOne(
      { _id: member._id },
      { $set: { account, email: user.email } },
    );
    await clerkClient.users.updateUserMetadata(user.id, {
      publicMetadata: { memberId: member._id.toString() },
    });
  }
}

async function setMissingMemberIds(clerkClient: ClerkClient): Promise<void> {
  const linkedMembers = await MemberModel.find(
    { 'account.clerkUserId': { $ne: null } },
    { account: 1 },
  ).lean<MemberRecord[]>();

  let missingCount = 0;
  for (const member of linkedMembers) {
    const clerkUserId = member.account?.clerkUserId;
    if (!clerkUserId) {
      continue;
    }

    const memberId = member._id.toString();
    const user = await clerkClient.users.getUser(clerkUserId);
    if (user.publicMetadata['memberId'] === memberId) {
      continue;
    }

    missingCount++;
    if (!dryRun) {
      await clerkClient.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { memberId },
      });
    }
  }

  console.log(`Set the member id on ${missingCount} Clerk account(s).`);
}

async function main(): Promise<void> {
  if (!MONGODB_URI || !database) {
    throw new Error(
      'Usage: migrate-members --database <name> [--link-accounts] [--dry-run]',
    );
  }
  // The Clerk key in .env belongs to the development instance, so it must never
  // be pointed at production data
  if (linkAccounts && database === MONGODB_DATABASE_PROD) {
    throw new Error('Accounts can only be linked in the development database.');
  }

  // Indexes are built explicitly after numbering, so a dry run never writes
  await mongoose.connect(MONGODB_URI, { dbName: database, autoIndex: false });
  console.log(`Connected to ${database}${dryRun ? ' (dry run)' : ''}.`);

  try {
    const numberByName = await assignReservedNumbers();
    await creditEditorsByNumber(numberByName);
    if (linkAccounts) {
      if (!CLERK_SECRET_KEY) {
        throw new Error('CLERK_SECRET_KEY is required to link accounts.');
      }
      const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });
      await linkRetiredAccounts(clerkClient);
      await setMissingMemberIds(clerkClient);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
