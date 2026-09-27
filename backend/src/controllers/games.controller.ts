import { Request, Response } from 'express';

import { ApiPaginatedResponse, ApiResponse } from '../models/api-response.model';
import { Id } from '../models/core.model';
import {
  ArchiveTournament,
  GameModel,
  GamePlayer,
  GameRecord,
  GameResponse,
  GamesSummary,
  MemberOpenings,
  OpeningCount,
  gameSortingConfig,
} from '../models/game.model';
import { PlayerModel, PlayerRecord } from '../models/player.model';
import {
  PLAYER_SORT_SIDES,
  buildGamesFilter,
  buildPlayerNameSortPipeline,
  parseGameFilters,
  resolvePlayers,
  toGameResponses,
} from '../services/games.service';
import { findProfilePlayerIds } from '../services/member-players.service';
import { widestGameIds } from '../services/widest.service';
import { isCollectionId } from '../util/is-collection-id.util';
import { buildPaginationQuery, parsePaginationParams } from '../util/pagination.util';

export type ArchivePlayer = GamePlayer & { gameCount: number };

export async function getGames(
  req: Request,
  res: Response<ApiPaginatedResponse<GameResponse>>,
): Promise<void> {
  try {
    const params = parsePaginationParams(req);
    const query = buildPaginationQuery<GameRecord>(params, gameSortingConfig);
    const filter = buildGamesFilter(parseGameFilters(req.query));
    const playerSide = PLAYER_SORT_SIDES[params.sortBy];

    const find = GameModel.find(filter).sort(query.sort).skip(query.skip);
    const [records, filteredCount, totalCount] = await Promise.all([
      playerSide
        ? GameModel.aggregate<GameRecord>(
            buildPlayerNameSortPipeline(
              filter,
              playerSide,
              params.sortOrder === 'asc' ? 1 : -1,
              query.skip,
              query.limit,
            ),
          ).exec()
        : (query.limit !== undefined ? find.limit(query.limit) : find).lean<
            GameRecord[]
          >(),
      GameModel.countDocuments(filter),
      GameModel.countDocuments({}),
    ]);

    res.status(200).json({
      data: { items: await toGameResponses(records), filteredCount, totalCount },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function getGame(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<GameResponse>>,
): Promise<void> {
  try {
    const { id } = req.params;
    const record = isCollectionId(id)
      ? await GameModel.findById(id).lean<GameRecord>()
      : null;

    if (!record) {
      res.status(404).json({ message: `Unable to find game [${id}]` });
      return;
    }

    const [game] = await toGameResponses([record]);
    res.status(200).json({ data: game });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function getPlayers(
  _req: Request,
  res: Response<ApiResponse<ArchivePlayer[]>>,
): Promise<void> {
  try {
    const records = await PlayerModel.find({ gameCount: { $gt: 0 } }).lean<
      PlayerRecord[]
    >();
    const resolved = await resolvePlayers(records.map(record => record._id.toString()));

    const players = records
      .flatMap(record => {
        const player = resolved.get(record._id.toString());
        return player ? [{ ...player, gameCount: record.gameCount }] : [];
      })
      .sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
      );

    res.status(200).json({ data: players });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function getTournaments(
  _req: Request,
  res: Response<ApiResponse<ArchiveTournament[]>>,
): Promise<void> {
  try {
    const groups = await GameModel.aggregate<{
      _id: string;
      sections: string[];
      years: number[];
      gameCount: number;
    }>([
      { $match: { tournament: { $ne: '' } } },
      {
        $group: {
          _id: '$tournament',
          sections: { $addToSet: '$section' },
          years: { $addToSet: '$year' },
          gameCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const tournaments: ArchiveTournament[] = groups.map(group => ({
      name: group._id,
      sections: group.sections.filter(section => section !== '').sort(),
      years: group.years.sort((a, b) => b - a),
      gameCount: group.gameCount,
    }));

    res.status(200).json({ data: tournaments });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function getSummary(
  _req: Request,
  res: Response<ApiResponse<GamesSummary>>,
): Promise<void> {
  try {
    const [gameCount, playerCount, tournaments, first, last] = await Promise.all([
      GameModel.countDocuments({}),
      PlayerModel.countDocuments({ gameCount: { $gt: 0 } }),
      GameModel.distinct('tournament', { tournament: { $ne: '' } }),
      GameModel.findOne({}, { year: 1 })
        .sort({ year: 1 })
        .lean<Pick<GameRecord, 'year'>>(),
      GameModel.findOne({}, { year: 1 })
        .sort({ year: -1 })
        .lean<Pick<GameRecord, 'year'>>(),
    ]);

    res.status(200).json({
      data: {
        gameCount,
        playerCount,
        tournamentCount: tournaments.length,
        firstYear: first?.year ?? null,
        lastYear: last?.year ?? null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

// The games holding the widest text of each column, for sizing the table before a page loads
export async function getWidestGames(
  _req: Request,
  res: Response<ApiResponse<GameResponse[]>>,
): Promise<void> {
  try {
    const records = await GameModel.find({ _id: { $in: await widestGameIds() } }).lean<
      GameRecord[]
    >();
    res.status(200).json({ data: await toGameResponses(records) });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

// Variations fold into their family, the part of the name before any comma or colon
function openingFamily(opening: string): string {
  return opening.split(/[,:]/)[0].trim();
}

function toOpeningCounts(openings: string[]): OpeningCount[] {
  const counts = new Map<string, number>();
  for (const opening of openings) {
    const family = openingFamily(opening);
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return [...counts]
    .map(([opening, gameCount]) => ({ opening, gameCount }))
    .sort((a, b) => b.gameCount - a.gameCount || a.opening.localeCompare(b.opening));
}

export async function getMemberOpenings(
  req: Request<{ number: string }>,
  res: Response<ApiResponse<MemberOpenings>>,
): Promise<void> {
  try {
    const { number } = req.params;
    const playerIds = await findProfilePlayerIds(number);

    if (!playerIds) {
      res.status(404).json({ message: `Unable to find member [${number}]` });
      return;
    }

    const records = playerIds.length
      ? await GameModel.find(
          {
            opening: { $ne: '' },
            $or: [
              { whitePlayerId: { $in: playerIds } },
              { blackPlayerId: { $in: playerIds } },
            ],
          },
          { whitePlayerId: 1, opening: 1 },
        ).lean<Pick<GameRecord, '_id' | 'whitePlayerId' | 'opening'>[]>()
      : [];

    const ownIds = new Set(playerIds);
    const asWhite = records.filter(({ whitePlayerId }) => ownIds.has(whitePlayerId));
    const asBlack = records.filter(({ whitePlayerId }) => !ownIds.has(whitePlayerId));

    res.status(200).json({
      data: {
        white: toOpeningCounts(asWhite.map(({ opening }) => opening)),
        black: toOpeningCounts(asBlack.map(({ opening }) => opening)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}
