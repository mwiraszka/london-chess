import { MemberModel, MemberRecord } from '../models/member.model';
import { PlayerModel, PlayerRecord } from '../models/player.model';

// The archive players linked to a member with a public profile, or null when no such
// member exists
export async function findProfilePlayerIds(number: string): Promise<string[] | null> {
  const member = /^\d+$/.test(number)
    ? await MemberModel.findOne(
        { number: Number(number), 'account.clerkUserId': { $ne: null } },
        { _id: 1 },
      ).lean<Pick<MemberRecord, '_id'>>()
    : null;

  if (!member) {
    return null;
  }

  const players = await PlayerModel.find(
    { memberId: member._id.toString() },
    { _id: 1 },
  ).lean<Pick<PlayerRecord, '_id'>[]>();
  return players.map(({ _id }) => _id.toString());
}
