import { Types } from 'mongoose';

import { Id } from '../models/core.model';
import { MemberModel, MemberRecord } from '../models/member.model';
import { PlayerModel, PlayerRecord } from '../models/player.model';
import { PlayerNameMatch, TournamentModel } from '../models/tournament.model';
import { isCollectionId } from '../util/is-collection-id.util';

export interface ParsedPlayerName {
  firstName: string;
  lastName: string;
  suffix: string;
}

type MemberName = Pick<MemberRecord, '_id' | 'firstName' | 'lastName' | 'number'>;

interface Candidates {
  players: PlayerRecord[];
  membersById: Map<Id, MemberName>;
  membersByName: Map<string, MemberName[]>;
}

export const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

const foldedKey = ({ firstName, lastName }: Omit<ParsedPlayerName, 'suffix'>): string =>
  `${fold(firstName)}|${fold(lastName)}`;

// Pairing software writes "Last, First", with any suffix after the first name
export function parsePlayerName(raw: string): ParsedPlayerName {
  const value = raw.trim().replace(/\s+/g, ' ');
  const comma = value.indexOf(',');
  if (comma === -1) {
    return { firstName: '', lastName: value, suffix: '' };
  }

  const lastName = value.slice(0, comma).trim();
  const rest = value.slice(comma + 1).trim();
  const suffix = rest.match(/^(.*?)\s+(Jr|Sr)\.?$/);
  return suffix
    ? { firstName: suffix[1], lastName, suffix: suffix[2] }
    : { firstName: rest, lastName, suffix: '' };
}

async function loadCandidates(): Promise<Candidates> {
  const [players, members] = await Promise.all([
    PlayerModel.find({}).lean<PlayerRecord[]>(),
    MemberModel.find({}, { firstName: 1, lastName: 1, number: 1 }).lean<MemberName[]>(),
  ]);

  const membersByName = new Map<string, MemberName[]>();
  for (const member of members) {
    const key = foldedKey(member);
    membersByName.set(key, [...(membersByName.get(key) ?? []), member]);
  }
  return {
    players,
    membersById: new Map(members.map(member => [member._id.toString(), member])),
    membersByName,
  };
}

// A player linked to a member wins, then the one with the most archived games
function preferred(players: PlayerRecord[]): PlayerRecord | null {
  return (
    [...players].sort(
      (a, b) =>
        Number(!!b.memberId) - Number(!!a.memberId) ||
        b.gameCount - a.gameCount ||
        a._id.toString().localeCompare(b._id.toString()),
    )[0] ?? null
  );
}

function findPlayer(
  name: ParsedPlayerName,
  players: PlayerRecord[],
): PlayerRecord | null {
  const exact = players.filter(
    player =>
      player.lastName === name.lastName &&
      player.firstName === name.firstName &&
      player.suffix === name.suffix,
  );
  if (exact.length) {
    return preferred(exact);
  }

  const key = foldedKey(name);
  return preferred(
    players.filter(
      player => foldedKey(player) === key && fold(player.suffix) === fold(name.suffix),
    ),
  );
}

// Only an unambiguous full name links a new player to a member
function findMember(name: ParsedPlayerName, candidates: Candidates): MemberName | null {
  if (!name.firstName || name.firstName.endsWith('.')) {
    return null;
  }
  const matches = candidates.membersByName.get(foldedKey(name)) ?? [];
  return matches.length === 1 ? matches[0] : null;
}

function matchName(raw: string, candidates: Candidates): PlayerNameMatch {
  const name = parsePlayerName(raw);
  const player = findPlayer(name, candidates.players);
  const member = player
    ? (player.memberId && candidates.membersById.get(player.memberId)) || null
    : findMember(name, candidates);
  return {
    name: raw,
    playerId: player?._id.toString() ?? null,
    memberNumber: member?.number ?? null,
  };
}

export async function matchPlayerNames(names: string[]): Promise<PlayerNameMatch[]> {
  const candidates = await loadCandidates();
  return [...new Set(names.map(name => name.trim()))].map(name =>
    matchName(name, candidates),
  );
}

// Adds any player the archive does not know yet, linked to their member when one matches
export async function resolvePlayerIds(names: string[]): Promise<Map<string, Id>> {
  const candidates = await loadCandidates();
  const ids = new Map<string, Id>();
  const additions: { raw: string; player: Omit<PlayerRecord, '_id'> }[] = [];

  for (const raw of new Set(names.map(name => name.trim()))) {
    const name = parsePlayerName(raw);
    const player = findPlayer(name, candidates.players);
    if (player) {
      ids.set(raw, player._id.toString());
      continue;
    }
    additions.push({
      raw,
      player: {
        ...name,
        memberId: findMember(name, candidates)?._id.toString() ?? null,
        gameCount: 0,
      },
    });
  }

  if (additions.length) {
    const created = await PlayerModel.insertMany(additions.map(({ player }) => player));
    additions.forEach(({ raw }, index) => ids.set(raw, created[index]._id.toString()));
  }
  return ids;
}

// Players only these results ever named go with them, so a corrected spelling leaves no
// stray record behind
export async function removeOrphanedPlayers(playerIds: Id[]): Promise<void> {
  const candidates = [...new Set(playerIds)].filter(isCollectionId);
  if (!candidates.length) {
    return;
  }

  const referenced = new Set(
    (
      await TournamentModel.distinct('sections.entries.playerId', {
        'sections.entries.playerId': { $in: candidates },
      })
    ).map(String),
  );
  const orphans = candidates.filter(id => !referenced.has(id));
  if (orphans.length) {
    await PlayerModel.deleteMany({
      _id: { $in: orphans.map(id => new Types.ObjectId(id)) },
      gameCount: 0,
    });
  }
}
