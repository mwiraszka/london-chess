import { MemberModel, MemberRecord, profileMemberFilter } from '../models/member.model';
import { PlayerModel, PlayerRecord } from '../models/player.model';
import { parseRecordNumber } from '../util/parse-record-number.util';

// The archive players linked to a member with a public profile, or null when no such
// member exists
export async function findProfilePlayerIds(number: string): Promise<string[] | null> {
  const memberNumber = parseRecordNumber(number);
  const member =
    memberNumber === null
      ? null
      : await MemberModel.findOne(profileMemberFilter(memberNumber), { _id: 1 }).lean<
          Pick<MemberRecord, '_id'>
        >();

  if (!member) {
    return null;
  }

  const players = await PlayerModel.find(
    { memberId: member._id.toString() },
    { _id: 1 },
  ).lean<Pick<PlayerRecord, '_id'>[]>();
  return players.map(({ _id }) => _id.toString());
}
