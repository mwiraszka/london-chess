import { PipelineStage } from 'mongoose';

import { Id } from '../models/core.model';
import { GameModel, GamePlayer, GameRecord } from '../models/game.model';
import {
  MemberTournamentResult,
  TournamentEntry,
  TournamentGame,
  TournamentRecord,
  TournamentResponse,
} from '../models/tournament.model';
import { UNKNOWN_PLAYER, resolvePlayers } from './games.service';

export type ArchiveGame = Pick<
  GameRecord,
  '_id' | 'section' | 'round' | 'date' | 'whitePlayerId' | 'blackPlayerId' | 'result'
>;

export const TOURNAMENT_SUMMARY_PIPELINE: PipelineStage[] = [
  {
    $project: {
      _id: 0,
      number: 1,
      name: 1,
      subtitle: 1,
      date: 1,
      endDate: 1,
      format: 1,
      timeControl: 1,
      isRated: 1,
      sectionCount: { $size: '$sections' },
      roundCount: { $max: '$sections.roundCount' },
      // A player entered in two sections is still one player
      playerCount: {
        $size: {
          $setUnion: [
            {
              $reduce: {
                input: '$sections.entries.playerId',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] },
              },
            },
          ],
        },
      },
    },
  },
  { $sort: { date: -1, number: -1 } },
];

// A round may also carry a board number
function roundNumber(round: string): number | null {
  const match = round.match(/^\d+/);
  return match ? Number(match[0]) : null;
}

const pairKey = (a: Id, b: Id): string => [a, b].sort().join('|');

export const roundKey = (rank: number, round: number): string => `${rank}|${round}`;

// A pairing met more than once is told apart by round
export function matchRoundGames(
  entries: TournamentEntry[],
  games: ArchiveGame[],
): Map<string, Id> {
  const byRank = new Map(entries.map(entry => [entry.rank, entry]));
  const gamesByPair = new Map<string, ArchiveGame[]>();
  for (const game of games) {
    const key = pairKey(game.whitePlayerId, game.blackPlayerId);
    gamesByPair.set(key, [...(gamesByPair.get(key) ?? []), game]);
  }

  const gameIds = new Map<string, Id>();
  for (const entry of entries) {
    for (const { round, outcome, opponentRank } of entry.rounds) {
      const opponent = opponentRank === null ? undefined : byRank.get(opponentRank);
      if (outcome !== 'game' || !opponent) continue;

      const candidates =
        gamesByPair.get(pairKey(entry.playerId, opponent.playerId)) ?? [];
      const matches =
        candidates.length > 1
          ? candidates.filter(game => roundNumber(game.round) === round)
          : candidates;
      if (matches.length === 1) {
        gameIds.set(roundKey(entry.rank, round), matches[0]._id.toString());
      }
    }
  }
  return gameIds;
}

function byRound(a: ArchiveGame, b: ArchiveGame): number {
  const roundA = roundNumber(a.round) ?? Infinity;
  const roundB = roundNumber(b.round) ?? Infinity;
  return (
    roundA - roundB || a.round.localeCompare(b.round) || a.date.localeCompare(b.date)
  );
}

export async function toTournamentResponse(
  record: TournamentRecord,
): Promise<TournamentResponse> {
  const { _id, gameArchiveTournament, sections, ...tournament } = record;
  const archiveSections = sections.flatMap(
    ({ gameArchiveSections }) => gameArchiveSections,
  );

  const games =
    gameArchiveTournament && archiveSections.length
      ? await GameModel.find(
          {
            tournament: gameArchiveTournament,
            year: Number(record.date.slice(0, 4)),
            section: { $in: archiveSections },
          },
          {
            section: 1,
            round: 1,
            date: 1,
            whitePlayerId: 1,
            blackPlayerId: 1,
            result: 1,
          },
        ).lean<ArchiveGame[]>()
      : [];

  const players = await resolvePlayers([
    ...sections.flatMap(({ entries }) => entries.map(({ playerId }) => playerId)),
    ...games.flatMap(game => [game.whitePlayerId, game.blackPlayerId]),
  ]);
  const player = (id: Id): GamePlayer => players.get(id) ?? { id, ...UNKNOWN_PLAYER };

  return {
    ...tournament,
    sections: sections.map(({ gameArchiveSections, entries, ...section }) => {
      const sectionGames = games
        .filter(game => gameArchiveSections.includes(game.section))
        .sort(byRound);
      const gameIds = matchRoundGames(entries, sectionGames);

      return {
        ...section,
        entries: entries.map(({ playerId, rounds, ...entry }) => ({
          ...entry,
          player: player(playerId),
          rounds: rounds.map(result => ({
            ...result,
            gameId: gameIds.get(roundKey(entry.rank, result.round)) ?? null,
          })),
        })),
        games: sectionGames.map((game): TournamentGame => ({
          id: game._id.toString(),
          section: game.section,
          round: game.round,
          date: game.date,
          result: game.result,
          white: player(game.whitePlayerId),
          black: player(game.blackPlayerId),
        })),
      };
    }),
  };
}

export function toMemberTournamentResults(
  records: TournamentRecord[],
  playerIds: Set<Id>,
): MemberTournamentResult[] {
  return records
    .flatMap(record =>
      record.sections.flatMap(section =>
        section.entries
          .filter(({ playerId }) => playerIds.has(playerId))
          .map(entry => ({
            tournament: {
              number: record.number,
              name: record.name,
              subtitle: record.subtitle,
              date: record.date,
              endDate: record.endDate,
              format: record.format,
              isRated: record.isRated,
            },
            section: section.name,
            roundCount: section.roundCount,
            playerCount: section.entries.length,
            rank: entry.rank,
            rating: entry.rating,
            provisionalGames: entry.provisionalGames,
            performanceRating: entry.performanceRating,
            score: entry.score,
            resultNote: entry.resultNote,
          })),
      ),
    )
    .sort(
      (a, b) =>
        b.tournament.date.localeCompare(a.tournament.date) ||
        b.tournament.number - a.tournament.number,
    );
}
