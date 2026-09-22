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
