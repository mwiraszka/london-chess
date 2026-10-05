import { MEMBER_NUMBER_COUNTER_ID } from '../models/counter.model';
import { MemberModel, MemberRecord } from '../models/member.model';
import { takeNextNumber } from './counters.service';

// A returning member keeps the number they had, so their profile link never changes
export async function assignMemberNumber(memberId: string): Promise<void> {
  const member = await MemberModel.findById(memberId, { number: 1 }).lean<MemberRecord>();
  if (!member || typeof member.number === 'number') {
    return;
  }

  await MemberModel.updateOne(
    { _id: memberId, number: { $exists: false } },
    { $set: { number: await takeNextMemberNumber() } },
  );
}

async function takeNextMemberNumber(): Promise<number> {
  // Members without a number sort last
  const [latest] = await MemberModel.find({}, { number: 1 })
    .sort({ number: -1 })
    .limit(1)
    .lean<{ number?: number }[]>();
  return takeNextNumber(MEMBER_NUMBER_COUNTER_ID, latest?.number ?? 0);
}
