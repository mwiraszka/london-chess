import { PipelineStage, Types } from 'mongoose';

import { EventModel } from '../models/event.model';
import { GameModel, GameRecord } from '../models/game.model';
import { MemberModel } from '../models/member.model';
import { PlayerModel, PlayerRecord } from '../models/player.model';
import { resolvePlayers } from './games.service';

// A few candidates per column, since text is only as wide as its font renders it
const CANDIDATES = 3;

type Aggregator = (pipeline: PipelineStage[]) => Promise<{ _id: Types.ObjectId }[]>;

// The ids of the documents holding the longest text the expression gives
async function longest(
  aggregate: Aggregator,
  expression: unknown,
  match: Record<string, unknown> = {},
): Promise<Types.ObjectId[]> {
  const results = await aggregate([
    { $match: match },
    { $project: { length: { $strLenCP: { $toString: { $ifNull: [expression, ''] } } } } },
    { $sort: { length: -1 } },
    { $limit: CANDIDATES },
  ]);
  return results.map(({ _id }) => _id);
}

// One document for every distinct value, so each label the column can show is present
async function oneOfEach(
  aggregate: Aggregator,
  expression: unknown,
): Promise<Types.ObjectId[]> {
  const results = await aggregate([
    { $group: { _id: expression, id: { $first: '$_id' } } },
    { $project: { _id: '$id' } },
  ]);
  return results.map(({ _id }) => _id);
}

function unique(ids: Types.ObjectId[]): Types.ObjectId[] {
  return [...new Map(ids.map(id => [id.toString(), id])).values()];
}

const games: Aggregator = pipeline => GameModel.aggregate(pipeline).exec();
const events: Aggregator = pipeline => EventModel.aggregate(pipeline).exec();
const members: Aggregator = pipeline => MemberModel.aggregate(pipeline).exec();

// Month names differ in width, so a full date from each month stands in for every date
const monthOf = (field: string) => ({ $substrCP: [field, 5, 2] });

async function playerGames(): Promise<Types.ObjectId[]> {
  const players = await PlayerModel.find({}, { _id: 1 }).lean<
    Pick<PlayerRecord, '_id'>[]
  >();
  const names = await resolvePlayers(players.map(({ _id }) => _id.toString()));
  const longestPlayers = [...names.values()]
    .map(player => ({
      id: player.id,
      length: `${player.firstName} ${player.lastName} ${player.suffix}`.trim().length,
    }))
    .sort((a, b) => b.length - a.length)
    .slice(0, CANDIDATES)
    .map(({ id }) => id);

  const found = await Promise.all(
    longestPlayers.flatMap(id => [
      GameModel.findOne({ whitePlayerId: id }, { _id: 1 }).lean<
        Pick<GameRecord, '_id'>
      >(),
      GameModel.findOne({ blackPlayerId: id }, { _id: 1 }).lean<
        Pick<GameRecord, '_id'>
      >(),
    ]),
  );
  return found.flatMap(game => (game ? [game._id] : []));
}

export async function widestGameIds(): Promise<Types.ObjectId[]> {
  const ids = await Promise.all([
    playerGames(),
    longest(games, { $concat: ['$tournament', ' (', '$section', ')'] }),
    longest(games, { $concat: ['$eco', ' ', '$opening'] }),
    longest(games, '$plyCount'),
    oneOfEach(games, '$result'),
    oneOfEach(games, {
      $cond: [{ $eq: [{ $strLenCP: '$date' }, 10] }, monthOf('$date'), '$date'],
    }),
  ]);
  return unique(ids.flat());
}

export async function widestEventIds(): Promise<Types.ObjectId[]> {
  const ids = await Promise.all([
    longest(events, '$title'),
    longest(events, '$details'),
    oneOfEach(events, '$type'),
    oneOfEach(events, monthOf('$eventDate')),
  ]);
  return unique(ids.flat());
}

export async function widestMemberIds(
  scope: 'public' | 'admin',
): Promise<Types.ObjectId[]> {
  const adminColumns =
    scope === 'admin'
      ? [
          longest(members, '$email'),
          longest(members, '$phoneNumber'),
          oneOfEach(members, monthOf('$dateJoined')),
          oneOfEach(members, monthOf('$modificationInfo.dateLastEdited')),
        ]
      : [];
  const ids = await Promise.all([
    ...adminColumns,
    longest(members, { $concat: ['$firstName', ' ', '$lastName'] }),
    longest(members, '$firstName'),
    longest(members, '$lastName'),
    longest(members, '$rating'),
    longest(members, '$peakRating'),
    longest(members, '$city'),
    longest(members, '$chessComUsername'),
    longest(members, '$lichessUsername'),
  ]);
  return unique(ids.flat());
}
