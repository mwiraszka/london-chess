import { QueryFilter, Types } from 'mongoose';

import { Id } from '../models/core.model';
import {
  GAME_RESULTS,
  Game,
  GamePlayer,
  GameRecord,
  GameResponse,
  GameResult,
} from '../models/game.model';
import { MemberModel, MemberRecord } from '../models/member.model';
import { PlayerModel, PlayerRecord } from '../models/player.model';
import { isCollectionId } from '../util/is-collection-id.util';

export interface GameFilters {
  player?: Id;
  year?: number;
  result?: GameResult;
}

type QueryValue = string | string[] | undefined;

const single = (value: QueryValue): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export function parseGameFilters(query: Record<string, unknown>): GameFilters {
  const read = (name: string): string | undefined => {
    const value = single(query[`filter_${name}`] as QueryValue)?.trim();
    return value ? value : undefined;
  };

  const filters: GameFilters = {};
  const player = read('player');
  const year = Number(read('year'));
  const result = read('result');

  if (isCollectionId(player)) filters.player = player;
  if (Number.isInteger(year) && year > 0) filters.year = year;
  if (GAME_RESULTS.includes(result as GameResult)) filters.result = result as GameResult;

  return filters;
}

export function buildGamesFilter(filters: GameFilters): QueryFilter<Game> {
  const conditions: QueryFilter<Game>[] = [];

  if (filters.player) {
    conditions.push({
      $or: [{ whitePlayerId: filters.player }, { blackPlayerId: filters.player }],
    });
  }
  if (filters.year) conditions.push({ year: filters.year });
  if (filters.result) conditions.push({ result: filters.result });

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return { $and: conditions };
}

type MemberName = Pick<MemberRecord, '_id' | 'firstName' | 'lastName' | 'number'>;

// Every player by id, named after their member record when they have one
export async function resolvePlayers(playerIds: Id[]): Promise<Map<Id, GamePlayer>> {
  const uniqueIds = [...new Set(playerIds)].filter(isCollectionId);
  const players = await PlayerModel.find({
    _id: { $in: uniqueIds.map(id => new Types.ObjectId(id)) },
  }).lean<PlayerRecord[]>();

  const memberIds = players
    .map(player => player.memberId)
    .filter((memberId): memberId is Id => isCollectionId(memberId));
  const members = memberIds.length
    ? await MemberModel.find(
        { _id: { $in: memberIds.map(id => new Types.ObjectId(id)) } },
        { firstName: 1, lastName: 1, number: 1 },
      ).lean<MemberName[]>()
    : [];
  const membersById = new Map(members.map(member => [member._id.toString(), member]));

  return new Map(
    players.map(player => {
      const member = player.memberId ? membersById.get(player.memberId) : undefined;
      return [
        player._id.toString(),
        {
          id: player._id.toString(),
          firstName: member?.firstName ?? player.firstName,
          lastName: member?.lastName ?? player.lastName,
          suffix: member ? '' : player.suffix,
          memberNumber: member?.number ?? null,
        },
      ];
    }),
  );
}

const UNKNOWN_PLAYER: Omit<GamePlayer, 'id'> = {
  firstName: '',
  lastName: 'Unknown',
  suffix: '',
  memberNumber: null,
};

export async function toGameResponses(records: GameRecord[]): Promise<GameResponse[]> {
  const players = await resolvePlayers(
    records.flatMap(record => [record.whitePlayerId, record.blackPlayerId]),
  );

  return records.map(record => {
    const { _id, whitePlayerId, blackPlayerId, ...game } = record;
    return {
      ...game,
      id: _id.toString(),
      white: players.get(whitePlayerId) ?? { id: whitePlayerId, ...UNKNOWN_PLAYER },
      black: players.get(blackPlayerId) ?? { id: blackPlayerId, ...UNKNOWN_PLAYER },
    };
  });
}
