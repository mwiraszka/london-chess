import { PipelineStage, Types } from 'mongoose';

import { Id } from '../models/core.model';
import { GameModel, GamePlayer, GameRecord } from '../models/game.model';
import { MemberModel, MemberRecord } from '../models/member.model';
import {
  EntryInput,
  MemberTournamentResult,
  RoundResult,
  SectionInput,
  Tournament,
  TournamentEntry,
  TournamentGame,
  TournamentRecord,
  TournamentRegistrant,
  TournamentRegistration,
  TournamentResponse,
  TournamentSection,
  TournamentSummary,
} from '../models/tournament.model';
import { isCollectionId } from '../util/is-collection-id.util';
import { performanceRatings } from '../util/performance-rating.util';
import { UNKNOWN_PLAYER, resolvePlayers } from './games.service';
import { matchPlayerNames, resolvePlayerIds } from './tournament-players.service';

export type ArchiveGame = Pick<
  GameRecord,
  '_id' | 'section' | 'round' | 'date' | 'whitePlayerId' | 'blackPlayerId' | 'result'
>;

export type TournamentSummaryRecord = Omit<TournamentSummary, 'registrants'> & {
  registrations: TournamentRegistration[];
};

export const TOURNAMENT_SUMMARY_PIPELINE: PipelineStage[] = [
  {
    $lookup: {
      from: GameModel.collection.name,
      let: {
        tournament: '$gameArchiveTournament',
        year: { $toInt: { $substrCP: ['$date', 0, 4] } },
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$tournament', '$$tournament'] },
                { $eq: ['$year', '$$year'] },
              ],
            },
          },
        },
        { $project: { _id: 0, section: 1 } },
      ],
      as: 'archiveGames',
    },
  },
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
      articleId: { $ifNull: ['$articleId', null] },
      // Tournaments recorded before online registration have neither field
      registrationOpens: { $ifNull: ['$registrationOpens', null] },
      registrationCloses: { $ifNull: ['$registrationCloses', null] },
      registrations: { $ifNull: ['$registrations', []] },
      sections: {
        $map: {
          input: '$sections',
          as: 'section',
          in: {
            name: '$$section.name',
            ratingBand: '$$section.ratingBand',
            roundCount: '$$section.roundCount',
            entryCount: { $size: '$$section.entries' },
            hasRounds: {
              $anyElementTrue: [
                {
                  $map: {
                    input: '$$section.entries',
                    as: 'entry',
                    in: { $gt: [{ $size: '$$entry.rounds' }, 0] },
                  },
                },
              ],
            },
            gameCount: {
              $size: {
                $filter: {
                  input: '$archiveGames',
                  as: 'game',
                  cond: { $in: ['$$game.section', '$$section.gameArchiveSections'] },
                },
              },
            },
          },
        },
      },
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

const roundKey = (rank: number, round: number): string => `${rank}|${round}`;

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

type RegistrantMember = Pick<
  MemberRecord,
  '_id' | 'firstName' | 'lastName' | 'number' | 'rating'
>;

// In the order they registered, leaving out anyone whose member record has since gone
export async function toRegistrants(
  registrations: TournamentRegistration[],
): Promise<TournamentRegistrant[]> {
  const memberIds = registrations.map(({ memberId }) => memberId).filter(isCollectionId);
  const members = memberIds.length
    ? await MemberModel.find(
        { _id: { $in: memberIds.map(id => new Types.ObjectId(id)) } },
        { firstName: 1, lastName: 1, number: 1, rating: 1 },
      ).lean<RegistrantMember[]>()
    : [];
  const membersById = new Map(members.map(member => [member._id.toString(), member]));

  return [...registrations]
    .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))
    .flatMap(({ memberId, registeredAt }) => {
      const member = membersById.get(memberId);
      return typeof member?.number === 'number'
        ? [
            {
              memberNumber: member.number,
              firstName: member.firstName,
              lastName: member.lastName,
              rating: member.rating,
              registeredAt,
            },
          ]
        : [];
    });
}

const sameScores = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((score, index) => score === b[index]);

const byRoundNumber = (a: RoundResult, b: RoundResult): number => a.round - b.round;

function sameRounds(a: RoundResult[], b: RoundResult[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const ours = [...a].sort(byRoundNumber);
  const theirs = [...b].sort(byRoundNumber);
  return ours.every(
    (result, index) =>
      result.round === theirs[index].round &&
      result.outcome === theirs[index].outcome &&
      result.points === theirs[index].points &&
      result.opponentRank === theirs[index].opponentRank &&
      result.color === theirs[index].color &&
      sameScores(result.scores, theirs[index].scores),
  );
}

function sameSection(
  input: SectionInput,
  recorded: TournamentSection,
  playerIdOf: (entry: EntryInput) => Id | null,
): boolean {
  if (
    input.ratingBand.trim() !== recorded.ratingBand ||
    input.roundCount !== recorded.roundCount ||
    input.isDoubleRound !== recorded.isDoubleRound ||
    input.entries.length !== recorded.entries.length
  ) {
    return false;
  }
  const recordedByRank = new Map(recorded.entries.map(entry => [entry.rank, entry]));
  return input.entries.every(entry => {
    const match = recordedByRank.get(entry.rank);
    return (
      !!match &&
      playerIdOf(entry) === match.playerId &&
      entry.rating === match.rating &&
      entry.provisionalGames === match.provisionalGames &&
      entry.score === match.score &&
      entry.tiebreak === match.tiebreak &&
      sameRounds(entry.rounds, match.rounds)
    );
  });
}

/**
 * Which imported sections differ from the recorded ones, and which recorded ones the import
 * leaves out. A player named only by name counts as the archive player that name finds, so
 * a section shows as changed exactly when saving it would change what is stored.
 */
export async function compareSections(
  inputs: SectionInput[],
  recorded: TournamentSection[],
): Promise<{ changed: boolean[]; removed: string[] }> {
  const named = inputs.flatMap(({ entries }) =>
    entries.filter(({ playerId }) => playerId === null).map(({ name }) => name),
  );
  const matches = named.length && recorded.length ? await matchPlayerNames(named) : [];
  const idsByName = new Map(matches.map(({ name, playerId }) => [name, playerId]));
  const playerIdOf = (entry: EntryInput): Id | null =>
    entry.playerId ?? idsByName.get(entry.name.trim()) ?? null;

  const inputNames = new Set(inputs.map(({ name }) => name.trim()));
  return {
    changed: inputs.map(input => {
      const match = recorded.find(({ name }) => name === input.name.trim());
      return !match || !sameSection(input, match, playerIdOf);
    }),
    removed: recorded.map(({ name }) => name).filter(name => !inputNames.has(name)),
  };
}

// A section saving leaves unchanged keeps everything it had, down to its performance
// ratings; a changed one keeps the archive sections it had, since an import cannot name them
export async function toStoredSections(
  inputs: SectionInput[],
  existing: TournamentSection[],
  format: Tournament['format'],
): Promise<TournamentSection[]> {
  const { changed } = await compareSections(inputs, existing);
  const playerIds = await resolvePlayerIds(
    inputs
      .filter((_, index) => changed[index])
      .flatMap(({ entries }) =>
        entries.filter(({ playerId }) => playerId === null).map(({ name }) => name),
      ),
  );

  return inputs.map((section, index) => {
    const recorded = existing.find(({ name }) => name === section.name.trim());
    if (!changed[index] && recorded) {
      return recorded;
    }
    const ratings = performanceRatings(
      section.entries,
      format === 'round-robin',
      section.isDoubleRound ? 2 : 1,
    );
    return {
      name: section.name.trim(),
      ratingBand: section.ratingBand.trim(),
      roundCount: section.roundCount,
      isDoubleRound: section.isDoubleRound,
      gameArchiveSections:
        existing.find(({ name }) => name === section.name.trim())?.gameArchiveSections ??
        [],
      entries: section.entries.map((entry, index) => ({
        rank: entry.rank,
        playerId: entry.playerId ?? (playerIds.get(entry.name.trim()) as Id),
        rating: entry.rating,
        provisionalGames: entry.provisionalGames,
        performanceRating: ratings[index],
        score: entry.score,
        tiebreak: entry.tiebreak,
        rounds: entry.rounds.map(round => ({
          round: round.round,
          outcome: round.outcome,
          scores: round.scores,
          points: round.points,
          opponentRank: round.opponentRank,
          color: round.color,
        })),
        resultNote: '',
      })),
    };
  });
}

export async function toTournamentResponse(
  record: TournamentRecord,
): Promise<TournamentResponse> {
  const { _id, gameArchiveTournament, sections, registrations, ...tournament } = record;
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
    registrationOpens: record.registrationOpens ?? null,
    registrationCloses: record.registrationCloses ?? null,
    modificationInfo: record.modificationInfo ?? null,
    registrants: await toRegistrants(registrations ?? []),
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
              timeControl: record.timeControl,
              isRated: record.isRated,
            },
            section: section.name,
            roundCount: section.roundCount,
            roundsPlayed: entry.rounds.filter(({ outcome }) => outcome === 'game').length,
            isDoubleRound: section.isDoubleRound,
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
