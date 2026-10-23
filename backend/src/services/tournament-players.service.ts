import { ClientSession, Types } from 'mongoose';

import { Id } from '../models/core.model';
import { MemberModel, MemberName, MemberRecord } from '../models/member.model';
import { PlayerModel, PlayerRecord } from '../models/player.model';
import { PlayerNameMatch, TournamentModel } from '../models/tournament.model';
import { isCollectionId } from '../util/is-collection-id.util';

interface ParsedPlayerName {
  firstName: string;
  lastName: string;
  suffix: string;
}

interface Candidates {
  players: PlayerRecord[];
  membersById: Map<Id, MemberName>;
  membersByName: Map<string, MemberName[]>;
}

interface PlayerLink {
  player: PlayerRecord;
  member: MemberName;
}

export const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

const foldedKey = ({ firstName, lastName }: Omit<ParsedPlayerName, 'suffix'>): string =>
  `${fold(firstName)}|${fold(lastName)}`;

// SwissSys writes "Last, First", with any suffix after the first name
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

function loadMembers(session?: ClientSession): Promise<MemberName[]> {
  return MemberModel.find({}, { firstName: 1, lastName: 1, number: 1 }, { session }).lean<
    MemberName[]
  >();
}

function groupByName(members: MemberName[]): Map<string, MemberName[]> {
  const membersByName = new Map<string, MemberName[]>();
  for (const member of members) {
    const key = foldedKey(member);
    membersByName.set(key, [...(membersByName.get(key) ?? []), member]);
  }
  return membersByName;
}

async function loadCandidates(): Promise<Candidates> {
  const [players, members] = await Promise.all([
    PlayerModel.find({}).lean<PlayerRecord[]>(),
    loadMembers(),
  ]);

  return {
    players,
    membersById: new Map(members.map(member => [member._id.toString(), member])),
    membersByName: groupByName(members),
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

// Only an unambiguous full name links a player to a member
function findMember(
  name: Omit<ParsedPlayerName, 'suffix'>,
  membersByName: Map<string, MemberName[]>,
): MemberName | null {
  if (!name.firstName || name.firstName.endsWith('.')) {
    return null;
  }
  const matches = membersByName.get(foldedKey(name)) ?? [];
  return matches.length === 1 ? matches[0] : null;
}

async function savePlayerLinks(
  links: PlayerLink[],
  session?: ClientSession,
): Promise<void> {
  if (!links.length) {
    return;
  }
  await PlayerModel.bulkWrite(
    links.map(({ player, member }) => ({
      updateOne: {
        filter: { _id: player._id, memberId: null },
        update: { $set: { memberId: member._id.toString() } },
      },
    })),
    { session },
  );
}

function matchName(raw: string, candidates: Candidates): PlayerNameMatch {
  const name = parsePlayerName(raw);
  const player = findPlayer(name, candidates.players);
  const member = player?.memberId
    ? (candidates.membersById.get(player.memberId) ?? null)
    : findMember(player ?? name, candidates.membersByName);
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

// Adds any player the archive does not know yet, and links each player to their member
// when one matches
export async function resolvePlayerIds(names: string[]): Promise<Map<string, Id>> {
  const candidates = await loadCandidates();
  const ids = new Map<string, Id>();
  const links: PlayerLink[] = [];
  const additions: { raw: string; player: Omit<PlayerRecord, '_id'> }[] = [];

  for (const raw of new Set(names.map(name => name.trim()))) {
    const name = parsePlayerName(raw);
    const player = findPlayer(name, candidates.players);
    if (player) {
      ids.set(raw, player._id.toString());
      const member = player.memberId
        ? null
        : findMember(player, candidates.membersByName);
      if (member) {
        links.push({ player, member });
      }
      continue;
    }
    additions.push({
      raw,
      player: {
        ...name,
        memberId: findMember(name, candidates.membersByName)?._id.toString() ?? null,
        gameCount: 0,
      },
    });
  }

  await savePlayerLinks(links);
  if (additions.length) {
    const created = await PlayerModel.insertMany(additions.map(({ player }) => player));
    additions.forEach(({ raw }, index) => ids.set(raw, created[index]._id.toString()));
  }
  return ids;
}

// Links each player not yet linked to a member to whichever of these members their full
// name matches, returning the players it linked
export async function linkPlayersToMembers(
  memberIds: Id[],
  session?: ClientSession,
): Promise<Id[]> {
  const ids = new Set(memberIds);
  const players = await PlayerModel.find({ memberId: null }, null, { session }).lean<
    PlayerRecord[]
  >();
  const membersByName = groupByName(await loadMembers(session));

  const links = players.flatMap(player => {
    const member = findMember(player, membersByName);
    return member && ids.has(member._id.toString()) ? [{ player, member }] : [];
  });
  await savePlayerLinks(links, session);
  return links.map(({ player }) => player._id.toString());
}

export async function unlinkPlayers(playerIds: Id[]): Promise<void> {
  if (!playerIds.length) {
    return;
  }
  await PlayerModel.updateMany(
    { _id: { $in: playerIds.map(id => new Types.ObjectId(id)) } },
    { $set: { memberId: null } },
  );
}

// Frees the players of a deleted member, then links them, and any players that the name
// being shared kept unlinked, to a member left carrying that name alone
export async function releasePlayers(
  member: Pick<MemberRecord, '_id' | 'firstName' | 'lastName'>,
  session?: ClientSession,
): Promise<void> {
  await PlayerModel.updateMany(
    { memberId: member._id.toString() },
    { $set: { memberId: null } },
    { session },
  );

  const key = foldedKey(member);
  const namesakes = (await loadMembers(session)).filter(
    other => foldedKey(other) === key,
  );
  if (namesakes.length) {
    await linkPlayersToMembers(
      namesakes.map(({ _id }) => _id.toString()),
      session,
    );
  }
}

// The IDs among these that name no player in the archive
export async function unknownPlayerIds(playerIds: Id[]): Promise<Id[]> {
  const candidates = [...new Set(playerIds)];
  if (candidates.some(id => !isCollectionId(id))) {
    return candidates.filter(id => !isCollectionId(id));
  }
  const found = new Set(
    (
      await PlayerModel.find(
        { _id: { $in: candidates.map(id => new Types.ObjectId(id)) } },
        { _id: 1 },
      ).lean<Pick<PlayerRecord, '_id'>[]>()
    ).map(({ _id }) => _id.toString()),
  );
  return candidates.filter(id => !found.has(id));
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
