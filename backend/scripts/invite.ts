import { createClerkClient } from '@clerk/backend';
import mongoose from 'mongoose';

import { MemberAccount, MemberModel, MemberRecord } from '../src/models/member.model';
import { sendEmail } from '../src/services/email.service';
import { assignMemberNumber } from '../src/services/member-numbers.service';
import { clerkErrorMessage } from '../src/util/clerk-error.util';
import { buildWelcomeEmail } from '../src/util/emails.util';
import { EMAIL_PATTERN, validateDetailField } from '../src/util/member-details.util';
import {
  generateTemporaryPassword,
  hashTemporaryPassword,
} from '../src/util/temporary-password.util';

const SITE_URL = 'https://londonchess.ca';

const required = [
  'MONGODB_URI',
  'MONGODB_DATABASE_PROD',
  'CLERK_SECRET_KEY_PROD',
  'ZOHO_SMTP_USER',
  'ZOHO_SMTP_PASSWORD',
] as const;

const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Missing ${missing.join(', ')}`);
  process.exit(1);
}

const env = (name: string): string => process.env[name] as string;

const clerkClient = createClerkClient({ secretKey: env('CLERK_SECRET_KEY_PROD') });

async function isInClerk(address: string): Promise<boolean> {
  const { totalCount } = await clerkClient.users.getUserList({
    emailAddress: [address],
    limit: 1,
  });
  return totalCount > 0;
}

function memberProblem(address: string, matches: MemberRecord[]): string | null {
  if (matches.length !== 1) {
    return matches.length
      ? `${address} belongs to ${matches.length} members`
      : `No member has ${address}`;
  }
  if (matches[0].account) {
    return `${address} is already linked to an account`;
  }
  if (!EMAIL_PATTERN.test(address)) {
    return `${address} is not a valid email address`;
  }
  const yearProblem = validateDetailField('yearOfBirth', matches[0].yearOfBirth);
  return yearProblem && `${address}: ${yearProblem}`;
}

async function invite(member: MemberRecord): Promise<void> {
  const temporaryPassword = generateTemporaryPassword();
  const clerkUser = await clerkClient.users.createUser({
    emailAddress: [member.email],
    firstName: member.firstName,
    lastName: member.lastName,
    password: temporaryPassword,
    publicMetadata: { memberId: member._id.toString() },
  });

  let step = 'save the member';
  try {
    const account: MemberAccount = {
      clerkUserId: clerkUser.id,
      isAdmin: false,
      clerkImageUrl: null,
      avatarUrl: null,
      avatarOriginalUrl: null,
      avatarManagedByApp: false,
      avatarCropState: null,
      avatarUpdatedAt: null,
      temporaryPasswordHash: hashTemporaryPassword(temporaryPassword),
    };
    const result = await MemberModel.updateOne(
      {
        _id: member._id,
        $or: [{ account: null }, { 'account.clerkUserId': clerkUser.id }],
      },
      { $set: { account } },
    );
    if (result.matchedCount === 0) {
      throw new Error('Another account was linked to this member at the same time.');
    }

    step = 'assign a member number';
    await assignMemberNumber(member._id.toString());
    const saved = await MemberModel.findById(member._id).lean<MemberRecord>();
    if (typeof saved?.number !== 'number') {
      throw new Error('The member has no member number.');
    }

    step = 'send the invitation';
    const email = buildWelcomeEmail(
      saved,
      temporaryPassword,
      `${SITE_URL}/account`,
      `${SITE_URL}/members/${saved.number}`,
    );
    await sendEmail(saved.email, email);
  } catch (error) {
    const leftovers: string[] = [];
    try {
      await clerkClient.users.deleteUser(clerkUser.id);
    } catch {
      leftovers.push('delete the Clerk account');
    }
    try {
      await MemberModel.replaceOne({ _id: member._id }, member);
    } catch {
      leftovers.push('restore the member record');
    }

    const reason = clerkErrorMessage(error, errorMessage(error));
    throw new Error(
      leftovers.length
        ? `Unable to ${step}, and could not ${leftovers.join(' or ')}. ${reason}`
        : `Unable to ${step}, so nothing was saved. ${reason}`,
      { cause: error },
    );
  }
}

async function main(): Promise<number> {
  const addresses = [...new Set(process.argv.slice(2))];
  if (!addresses.length) {
    console.error('Pass the email addresses to invite');
    return 1;
  }

  await mongoose.connect(env('MONGODB_URI'), { dbName: env('MONGODB_DATABASE_PROD') });
  try {
    const skipped: string[] = [];
    const members: MemberRecord[] = [];
    const problems: string[] = [];
    for (const address of addresses) {
      if (await isInClerk(address)) {
        skipped.push(address);
        continue;
      }
      const matches = await MemberModel.find({ email: address }).lean<MemberRecord[]>();
      const problem = memberProblem(address, matches);
      if (problem) {
        problems.push(problem);
      } else {
        members.push(matches[0]);
      }
    }
    if (problems.length) {
      problems.forEach(problem => console.error(problem));
      console.error('Nothing was sent.');
      return 1;
    }

    const sent: string[] = [];
    const failed: string[] = [];
    for (const member of members) {
      try {
        await invite(member);
        sent.push(member.email);
      } catch (error) {
        failed.push(`${member.email}: ${errorMessage(error)}`);
      }
    }

    printList(`Sent (${sent.length})`, sent);
    printList(`Skipped, already in Clerk (${skipped.length})`, skipped);
    if (failed.length) {
      printList(`Failed (${failed.length})`, failed);
    }
    return failed.length ? 1 : 0;
  } finally {
    await mongoose.disconnect();
  }
}

function printList(heading: string, lines: string[]): void {
  console.warn(heading);
  lines.forEach(line => console.warn(`  ${line}`));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

main()
  .then(code => process.exit(code))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
