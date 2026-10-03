import { Types } from 'mongoose';

import { Id } from '../models/core.model';
import { GameModel, GameRecord } from '../models/game.model';
import { ModificationInfo } from '../models/modification-info.model';
import { PlayerModel } from '../models/player.model';
import { GameInput, TournamentSection } from '../models/tournament.model';
import { openingName } from '../util/opening-name.util';

type StoredGameKey = Pick<
  GameRecord,
  'year' | 'section' | 'round' | 'whitePlayerId' | 'blackPlayerId'
>;

const gameKey = ({
  year,
  section,
  round,
  whitePlayerId,
  blackPlayerId,
}: StoredGameKey): string =>
  [year, section, round.trim(), whitePlayerId, blackPlayerId].join('|');

const yearOf = (game: GameInput): number => Number(game.date.slice(0, 4));

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

// Adds the games the archive does not hold yet and counts each one for both its players
export async function archiveGames(
  tournament: string,
  games: GameInput[],
  modificationInfo: ModificationInfo,
): Promise<number> {
  if (!games.length) {
    return 0;
  }

  const stored = await GameModel.find(
    {
      tournament,
      year: { $in: [...new Set(games.map(yearOf))] },
      section: { $in: [...new Set(games.map(({ section }) => section))] },
    },
    { year: 1, section: 1, round: 1, whitePlayerId: 1, blackPlayerId: 1 },
  ).lean<StoredGameKey[]>();
  const known = new Set(stored.map(gameKey));

  const additions = games.filter(game => {
    const key = gameKey({ ...game, year: yearOf(game) });
    if (known.has(key)) {
      return false;
    }
    known.add(key);
    return true;
  });
  if (!additions.length) {
    return 0;
  }

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
  return additions.length;
}
