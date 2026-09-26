import { Types } from 'mongoose';

import { CounterModel, MEMBER_NUMBER_COUNTER_ID } from '../models/counter.model';
import {
  EditableMemberFields,
  Member,
  MemberAccount,
  MemberModel,
  MemberRecord,
} from '../models/member.model';
import { ModificationInfo } from '../models/modification-info.model';
import { LinkedMemberRecord } from '../util/member-responses.util';

export const MODIFICATION_INFO: ModificationInfo = {
  dateCreated: '2024-01-01T00:00:00.000Z',
  createdBy: 'Someone Else',
  createdByNumber: null,
  dateLastEdited: '2024-01-01T00:00:00.000Z',
  lastEditedBy: 'Someone Else',
  lastEditedByNumber: null,
};

export function memberFields(
  overrides: Partial<EditableMemberFields> = {},
): EditableMemberFields {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    rating: '1500',
    peakRating: '1600',
    email: 'jane@example.com',
    phoneNumber: '',
    city: 'London',
    yearOfBirth: '1990',
    chessComUsername: '',
    lichessUsername: '',
    isActive: true,
    dateJoined: '2022-08-18T04:00:00.000Z',
    modificationInfo: MODIFICATION_INFO,
    ...overrides,
  };
}

export function memberAccount(overrides: Partial<MemberAccount> = {}): MemberAccount {
  return {
    clerkUserId: 'user_test',
    isAdmin: false,
    clerkImageUrl: null,
    avatarUrl: null,
    avatarOriginalUrl: null,
    avatarManagedByApp: false,
    clerkImagePending: false,
    avatarCropState: null,
    avatarUpdatedAt: null,
    temporaryPasswordHash: null,
    ...overrides,
  };
}

type NewMember = Partial<Omit<Member, 'id'>> & { _id?: Types.ObjectId };

export async function createMember(overrides: NewMember = {}): Promise<MemberRecord> {
  const { _id } = await MemberModel.create({ ...memberFields(), ...overrides });
  return readMember(_id);
}

export async function createAccountHolder(
  account: Partial<MemberAccount> = {},
  overrides: NewMember = {},
): Promise<LinkedMemberRecord> {
  const record = await createMember({
    number: 1,
    account: memberAccount(account),
    ...overrides,
  });
  return { ...record, account: memberAccount(account) };
}

export async function createAdmin(clerkUserId = 'user_admin'): Promise<MemberRecord> {
  return createMember({
    firstName: 'Ada',
    lastName: 'Admin',
    email: 'admin@example.com',
    number: 100,
    account: memberAccount({ clerkUserId, isAdmin: true }),
  });
}

export async function readMember(id: Types.ObjectId | string): Promise<MemberRecord> {
  const record = await MemberModel.findById(id).lean<MemberRecord>();
  if (!record) {
    throw new Error(`Member ${id} was not saved.`);
  }
  return record;
}

export async function startMemberNumbers(next: number): Promise<void> {
  await CounterModel.create({ _id: MEMBER_NUMBER_COUNTER_ID, next });
}
