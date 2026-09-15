import { CounterModel, MEMBER_NUMBER_COUNTER_ID } from '../models/counter.model';
import { MemberModel, MemberRecord } from '../models/member.model';

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

// Numbers are handed out once and never reused, so an old profile link can
// never lead to a different person after a member is deleted
export async function takeNextMemberNumber(): Promise<number> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: MEMBER_NUMBER_COUNTER_ID },
    { $inc: { next: 1 } },
  ).lean();

  if (!counter) {
    throw new Error('The member number counter has not been initialized.');
  }
  return counter.next;
}
