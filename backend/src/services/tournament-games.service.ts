import { Types } from 'mongoose';

import { Id } from '../models/core.model';
import { GameModel, GameRecord } from '../models/game.model';
import { ModificationInfo } from '../models/modification-info.model';
import { PlayerModel } from '../models/player.model';
import { GameChange, GameInput, TournamentSection } from '../models/tournament.model';
import { openingName } from '../util/opening-name.util';

type StoredGame = Pick<
  GameRecord,
  | '_id'
  | 'year'
  | 'section'
  | 'round'
  | 'date'
  | 'whitePlayerId'
  | 'blackPlayerId'
  | 'result'
  | 'whiteElo'
  | 'blackElo'
  | 'eco'
  | 'plyCount'
  | 'moves'
  | 'modificationInfo'
>;

type GameKey = Pick<
  GameRecord,
  'year' | 'section' | 'round' | 'whitePlayerId' | 'blackPlayerId'
>;

const gameKey = ({
  year,
  section,
  round,
  whitePlayerId,
  blackPlayerId,
}: GameKey): string =>
  [year, section, round.trim(), whitePlayerId, blackPlayerId].join('|');

const yearOf = (game: GameInput): number => Number(game.date.slice(0, 4));

const sameMoves = (a: string, b: string): boolean =>
  a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

// A game is told apart from its archived copy by anything the PGN records about it
function hasChanged(stored: StoredGame, game: GameInput): boolean {
  return (
    stored.result !== game.result ||
    stored.date !== game.date ||
    stored.whiteElo !== game.whiteElo ||
    stored.blackElo !== game.blackElo ||
    stored.eco !== game.eco ||
    stored.plyCount !== game.plyCount ||
    !sameMoves(stored.moves, game.moves)
  );
}

async function storedGames(
  tournament: string,
  games: GameInput[],
): Promise<Map<string, StoredGame>> {
  if (!games.length) {
    return new Map();
  }
  const stored = await GameModel.find(
    {
      tournament,
      year: { $in: [...new Set(games.map(yearOf))] },
      section: { $in: [...new Set(games.map(({ section }) => section))] },
    },
    {
      year: 1,
      section: 1,
      round: 1,
      date: 1,
      whitePlayerId: 1,
      blackPlayerId: 1,
      result: 1,
      whiteElo: 1,
      blackElo: 1,
      eco: 1,
      plyCount: 1,
      moves: 1,
      modificationInfo: 1,
    },
  ).lean<StoredGame[]>();
  return new Map(stored.map(game => [gameKey(game), game]));
}

// How each game compares with the archive: one it lacks, one it holds differently, or the same
export async function classifyGames(
  tournament: string,
  games: GameInput[],
): Promise<GameChange[]> {
  const stored = await storedGames(tournament, games);
  return games.map(game => {
    const match = stored.get(gameKey({ ...game, year: yearOf(game) }));
    return !match ? 'new' : hasChanged(match, game) ? 'changed' : 'unchanged';
  });
}

// A section shows the games its own players played under the tournament's name
export function withGameSections(
  sections: TournamentSection[],
  games: GameInput[],
): TournamentSection[] {
  return sections.map(section => {
    const playerIds = new Set(section.entries.map(({ playerId }) => playerId));
    const labels = games
      .filter(
        ({ whitePlayerId, blackPlayerId }) =>
          playerIds.has(whitePlayerId) || playerIds.has(blackPlayerId),
      )
      .map(({ section: label }) => label);
    return {
      ...section,
      gameArchiveSections: [...new Set([...section.gameArchiveSections, ...labels])],
    };
  });
}

/**
 * Brings the archive in line with the games: adds the ones it lacks, counting each for both
 * its players, and rewrites the ones it holds differently. Games it already holds as they
 * are stay untouched.
 */
export async function archiveGames(
  tournament: string,
  games: GameInput[],
  modificationInfo: ModificationInfo,
): Promise<void> {
  const stored = await storedGames(tournament, games);
  const additions: GameInput[] = [];
  const updates: { stored: StoredGame; game: GameInput }[] = [];
  const seen = new Set<string>();
  for (const game of games) {
    const key = gameKey({ ...game, year: yearOf(game) });
    if (seen.has(key)) continue;
    seen.add(key);
    const match = stored.get(key);
    if (!match) {
      additions.push(game);
    } else if (hasChanged(match, game)) {
      updates.push({ stored: match, game });
    }
  }

  if (additions.length) {
    await GameModel.insertMany(
      additions.map(game => ({
        tournament,
        section: game.section,
        location: 'London',
        year: yearOf(game),
        date: game.date,
        round: game.round.trim(),
        whitePlayerId: game.whitePlayerId,
        blackPlayerId: game.blackPlayerId,
        result: game.result,
        whiteElo: game.whiteElo,
        blackElo: game.blackElo,
        eco: game.eco,
        opening: openingName(game.eco, game.moves),
        plyCount: game.plyCount,
        moves: game.moves.trim(),
        annotator: '',
        modificationInfo,
      })),
    );

    const counts = new Map<Id, number>();
    for (const { whitePlayerId, blackPlayerId } of additions) {
      for (const id of [whitePlayerId, blackPlayerId]) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    await PlayerModel.bulkWrite(
      [...counts].map(([id, count]) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(id) },
          update: { $inc: { gameCount: count } },
        },
      })),
    );
  }

  if (updates.length) {
    await GameModel.bulkWrite(
      updates.map(({ stored: match, game }) => ({
        updateOne: {
          filter: { _id: match._id },
          update: {
            $set: {
              year: yearOf(game),
              date: game.date,
              result: game.result,
              whiteElo: game.whiteElo,
              blackElo: game.blackElo,
              eco: game.eco,
              opening: openingName(game.eco, game.moves),
              plyCount: game.plyCount,
              moves: game.moves.trim(),
              modificationInfo: {
                ...match.modificationInfo,
                lastEditedBy: modificationInfo.lastEditedBy,
                lastEditedByNumber: modificationInfo.lastEditedByNumber,
                dateLastEdited: modificationInfo.dateLastEdited,
              },
            },
          },
        },
      })),
    );
  }
}
