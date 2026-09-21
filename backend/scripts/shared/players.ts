import { Types } from 'mongoose';

import { MemberModel, MemberRecord } from '../../src/models/member.model';
import { Player, PlayerModel, PlayerRecord } from '../../src/models/player.model';
import { TournamentModel } from '../../src/models/tournament.model';
import { isCollectionId } from '../../src/util/is-collection-id.util';
import { ParsedPlayerName, parsePlayerName } from '../../src/util/pgn.util';
import { PLAYER_MERGES } from '../game-archive/players';

// Both imports write players by name, so a person gets one record between them

export const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

export const playerKey = ({ firstName, lastName, suffix }: ParsedPlayerName): string =>
  `${lastName}, ${firstName}${suffix ? ` ${suffix}` : ''}`;

function merged(
  name: ParsedPlayerName,
  merges: Record<string, string>,
): ParsedPlayerName {
  const target = merges[playerKey(name)];
  return target ? parsePlayerName(target) : name;
}

export function canonicalPlayer(
  raw: string,
  sourceMerges: Record<string, string> = {},
): ParsedPlayerName {
  return merged(merged(parsePlayerName(raw), sourceMerges), PLAYER_MERGES);
}

export type MemberMatch = { memberId: string } | { ambiguous: number } | null;

export async function loadMemberMatcher(): Promise<
  (name: ParsedPlayerName) => MemberMatch
> {
  const members = await MemberModel.find({}, { firstName: 1, lastName: 1 }).lean<
    Pick<MemberRecord, '_id' | 'firstName' | 'lastName'>[]
  >();
  const membersByName = new Map<string, typeof members>();
  for (const member of members) {
    const key = `${fold(member.firstName)}|${fold(member.lastName)}`;
    membersByName.set(key, [...(membersByName.get(key) ?? []), member]);
  }

  return ({ firstName, lastName }) => {
    if (!firstName || firstName.endsWith('.')) {
      return null;
    }
    const matches = membersByName.get(`${fold(firstName)}|${fold(lastName)}`) ?? [];
    if (matches.length === 1) {
      return { memberId: matches[0]._id.toString() };
    }
    return matches.length ? { ambiguous: matches.length } : null;
  };
}

export type PendingPlayer = Omit<Player, 'id'>;

// Stored players keep their ids, and a stored member link is never replaced. With
// countsGames, players absent from the map are left with no games.
export async function savePlayers(
  players: Map<string, PendingPlayer>,
  { countsGames }: { countsGames: boolean },
): Promise<Map<string, string>> {
  const stored = await PlayerModel.find({}).lean<PlayerRecord[]>();
  const storedByKey = new Map<string, PlayerRecord>();
  for (const record of stored) {
    const key = playerKey(record);
    if (!storedByKey.has(key)) storedByKey.set(key, record);
  }

  const ids = new Map<string, string>();
  const updates = [];
  const additions: [string, PendingPlayer][] = [];
  for (const [key, player] of players) {
    const record = storedByKey.get(key);
    if (!record) {
      additions.push([key, player]);
      continue;
    }

    ids.set(key, record._id.toString());
    const changes: Partial<PendingPlayer> = {};
    if (countsGames && record.gameCount !== player.gameCount) {
      changes.gameCount = player.gameCount;
    }
    if (!record.memberId && player.memberId) {
      changes.memberId = player.memberId;
    }
    if (Object.keys(changes).length) {
      updates.push({
        updateOne: { filter: { _id: record._id }, update: { $set: changes } },
      });
    }
  }

  if (countsGames) {
    for (const record of stored) {
      if (record.gameCount && !players.has(playerKey(record))) {
        updates.push({
          updateOne: { filter: { _id: record._id }, update: { $set: { gameCount: 0 } } },
        });
      }
    }
  }

  if (updates.length) {
    await PlayerModel.bulkWrite(updates);
  }
  const created = await PlayerModel.insertMany(additions.map(([, player]) => player));
  additions.forEach(([key], index) => ids.set(key, created[index]._id.toString()));
  return ids;
}

// Spellings merged away leave players nothing refers to
export async function removeUnreferencedPlayers(): Promise<number> {
  const referenced = await TournamentModel.distinct('sections.entries.playerId');
  const { deletedCount } = await PlayerModel.deleteMany({
    gameCount: 0,
    _id: { $nin: referenced.filter(isCollectionId).map(id => new Types.ObjectId(id)) },
  });
  return deletedCount;
}
