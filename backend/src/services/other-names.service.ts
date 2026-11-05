import { Types } from 'mongoose';

import { Id } from '../models/core.model';
import { MemberModel, MemberName } from '../models/member.model';
import { PlayerModel, PlayerRecord } from '../models/player.model';
import {
  ParsedPlayerName,
  findPlayer,
  fold,
  foldedKey,
  parsePlayerName,
  removeOrphanedPlayers,
} from './tournament-players.service';

export const MAX_OTHER_NAMES = 20;

type Named = Pick<PlayerRecord, 'firstName' | 'lastName' | 'suffix'>;

// As SwissSys and PGNs write a player
export function lastFirst({ firstName, lastName, suffix }: Named): string {
  const given = [firstName, suffix].filter(Boolean).join(' ');
  return given ? `${lastName}, ${given}` : lastName;
}

const nameKey = (name: Named): string => `${foldedKey(name)}|${fold(name.suffix)}`;

const isOwnName = (name: Named, member: Pick<MemberName, 'firstName' | 'lastName'>) =>
  !name.suffix && foldedKey(name) === foldedKey(member);

// The names each member was recorded under besides their own, alphabetically
export async function otherNamesOf(memberIds: Id[]): Promise<Map<Id, string[]>> {
  const ids = [...new Set(memberIds)];
  const [members, players] = ids.length
    ? await Promise.all([
        MemberModel.find(
          { _id: { $in: ids.map(id => new Types.ObjectId(id)) } },
          { firstName: 1, lastName: 1 },
        ).lean<Pick<MemberName, '_id' | 'firstName' | 'lastName'>[]>(),
        PlayerModel.find({ memberId: { $in: ids } }).lean<PlayerRecord[]>(),
      ])
    : [[], []];

  return new Map(
    members.map(member => {
      const id = member._id.toString();
      return [
        id,
        players
          .filter(player => player.memberId === id && !isOwnName(player, member))
          .map(lastFirst)
          .sort((a, b) => a.localeCompare(b)),
      ];
    }),
  );
}

export type OtherNamesResult = { otherNames: string[] } | { problem: string };

/**
 * Gives the member exactly these other names. A name new to them takes the archive player
 * recorded under it, or a new one, so every later import finds the member by it; a name
 * dropped is unlinked, and goes when nothing was ever recorded under it.
 */
export async function setOtherNames(
  member: Pick<MemberName, '_id' | 'firstName' | 'lastName'>,
  names: string[],
): Promise<OtherNamesResult> {
  const memberId = member._id.toString();
  const wanted = new Map<string, ParsedPlayerName>();
  for (const raw of names) {
    const name = parsePlayerName(raw);
    if (isOwnName(name, member)) {
      return { problem: `${raw.trim()} is already the member's own name.` };
    }
    wanted.set(nameKey(name), name);
  }

  const players = await PlayerModel.find({}).lean<PlayerRecord[]>();
  const linked = players.filter(
    player => player.memberId === memberId && !isOwnName(player, member),
  );

  const toLink: PlayerRecord[] = [];
  const toCreate: ParsedPlayerName[] = [];
  for (const [key, name] of wanted) {
    if (linked.some(player => nameKey(player) === key)) {
      continue;
    }
    const player = findPlayer(name, players);
    if (player?.memberId && player.memberId !== memberId) {
      return { problem: `${lastFirst(name)} is already recorded for another member.` };
    }
    if (player) {
      toLink.push(player);
    } else {
      toCreate.push(name);
    }
  }
  const dropped = linked.filter(player => !wanted.has(nameKey(player)));

  if (toLink.length) {
    await PlayerModel.updateMany(
      { _id: { $in: toLink.map(({ _id }) => _id) } },
      { $set: { memberId } },
    );
  }
  if (toCreate.length) {
    await PlayerModel.insertMany(
      toCreate.map(name => ({ ...name, memberId, gameCount: 0 })),
    );
  }
  if (dropped.length) {
    await PlayerModel.updateMany(
      { _id: { $in: dropped.map(({ _id }) => _id) } },
      { $set: { memberId: null } },
    );
    await removeOrphanedPlayers(dropped.map(({ _id }) => _id.toString()));
  }

  return { otherNames: (await otherNamesOf([memberId])).get(memberId) ?? [] };
}
