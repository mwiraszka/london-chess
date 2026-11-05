import { Id } from '../models/core.model';
import { GameModel, GameRecord, GameResult } from '../models/game.model';
import {
  HeadToHeadGame,
  PieceColor,
  RoundResult,
  TournamentModel,
  TournamentRecord,
  TournamentSection,
} from '../models/tournament.model';
import { roundNumber } from './tournaments.service';

type PairGame = Pick<
  GameRecord,
  | '_id'
  | 'tournament'
  | 'section'
  | 'year'
  | 'date'
  | 'round'
  | 'whitePlayerId'
  | 'blackPlayerId'
  | 'result'
>;

type FilingSection = Pick<TournamentSection, 'name' | 'gameArchiveSections'>;

type FilingRecord = Pick<
  TournamentRecord,
  'number' | 'name' | 'date' | 'gameArchiveTournament'
> & { sections: FilingSection[] };

type CrosstableRecord = Pick<
  TournamentRecord,
  'number' | 'name' | 'date' | 'gameArchiveTournament' | 'sections'
>;

const WHITE_SCORES: Record<GameResult, number | null> = {
  '1-0': 1,
  '0-1': 0,
  '1/2-1/2': 0.5,
  '*': null,
};

const recordYear = ({ date }: Pick<TournamentRecord, 'date'>): number =>
  Number(date.slice(0, 4));

// Whether the archive files the game under the tournament and section
const filedUnder = (
  game: PairGame,
  record: Pick<TournamentRecord, 'date' | 'gameArchiveTournament'>,
  section: Pick<TournamentSection, 'gameArchiveSections'>,
): boolean =>
  game.tournament === record.gameArchiveTournament &&
  game.year === recordYear(record) &&
  section.gameArchiveSections.includes(game.section);

function filingOf(
  game: PairGame,
  records: FilingRecord[],
): { record: FilingRecord; section: FilingSection } | null {
  for (const record of records) {
    const section = record.sections.find(candidate =>
      filedUnder(game, record, candidate),
    );
    if (section) {
      return { record, section };
    }
  }
  return null;
}

function colorOf(game: PairGame, firstIds: ReadonlySet<Id>): PieceColor {
  return firstIds.has(game.whitePlayerId) ? 'white' : 'black';
}

// The archived game behind one game of a round: the pair's only game when the section
// has only the one, or else the one numbered for that game. A double round's second
// game is numbered a whole round count on from its first
function linkedGame(
  pairGames: PairGame[],
  round: number,
  gameIndex: number,
  roundCount: number,
  meetingCount: number,
): PairGame | null {
  if (pairGames.length === 1 && meetingCount === 1) {
    return pairGames[0];
  }
  const numbered = pairGames.filter(
    game => roundNumber(game.round) === round + gameIndex * roundCount,
  );
  return numbered.length === 1 ? numbered[0] : null;
}

/**
 * Every game the two members played each other, from the first one's side, newest first.
 * A crosstable's pairings give the games of a tournament it records, each linked to its
 * archived copy where there is one, so forfeits stay out and games without moves still
 * count. The archive gives the games of every other event.
 */
export async function headToHeadGames(
  firstIds: Id[],
  secondIds: Id[],
): Promise<HeadToHeadGame[]> {
  if (!firstIds.length || !secondIds.length) {
    return [];
  }

  const [records, pairGames] = await Promise.all([
    TournamentModel.find(
      {
        $and: [
          { 'sections.entries.playerId': { $in: firstIds } },
          { 'sections.entries.playerId': { $in: secondIds } },
        ],
      },
      { number: 1, name: 1, date: 1, gameArchiveTournament: 1, sections: 1 },
    ).lean<CrosstableRecord[]>(),
    GameModel.find(
      {
        $or: [
          { whitePlayerId: { $in: firstIds }, blackPlayerId: { $in: secondIds } },
          { whitePlayerId: { $in: secondIds }, blackPlayerId: { $in: firstIds } },
        ],
      },
      {
        tournament: 1,
        section: 1,
        year: 1,
        date: 1,
        round: 1,
        whitePlayerId: 1,
        blackPlayerId: 1,
        result: 1,
      },
    ).lean<PairGame[]>(),
  ]);

  const first = new Set(firstIds);
  const second = new Set(secondIds);
  const games: HeadToHeadGame[] = [];
  // Archived games a crosstable already counts
  const counted = new Set<string>();

  for (const record of records) {
    for (const section of record.sections) {
      const firstEntry = section.entries.find(({ playerId }) => first.has(playerId));
      const secondEntry = section.entries.find(({ playerId }) => second.has(playerId));
      const meetings: RoundResult[] =
        firstEntry && secondEntry
          ? firstEntry.rounds.filter(
              ({ outcome, opponentRank }) =>
                outcome === 'game' && opponentRank === secondEntry.rank,
            )
          : [];
      if (!meetings.length) {
        continue;
      }

      const sectionGames = pairGames.filter(game => filedUnder(game, record, section));
      sectionGames.forEach(({ _id }) => counted.add(_id.toString()));
      const meetingCount = meetings.reduce(
        (count, { scores }) => count + scores.length,
        0,
      );

      for (const meeting of meetings) {
        meeting.scores.forEach((score, gameIndex) => {
          const game = linkedGame(
            sectionGames,
            meeting.round,
            gameIndex,
            section.roundCount,
            meetingCount,
          );
          games.push({
            tournamentNumber: record.number,
            tournament: record.name,
            section: section.name,
            date: game?.date ?? record.date,
            round: String(meeting.round),
            // A round's recorded colour is that of its first game
            color: game ? colorOf(game, first) : gameIndex === 0 ? meeting.color : null,
            score,
            gameId: game?._id.toString() ?? null,
          });
        });
      }
    }
  }

  // A game whose result was never recorded has no score to count
  const archiveOnly = pairGames.flatMap(game => {
    const whiteScore = WHITE_SCORES[game.result];
    return counted.has(game._id.toString()) || whiteScore === null
      ? []
      : [{ game, whiteScore }];
  });
  const filingRecords = await recordsFiling(archiveOnly.map(({ game }) => game));

  for (const { game, whiteScore } of archiveOnly) {
    const color = colorOf(game, first);
    const filing = filingOf(game, filingRecords);
    games.push({
      tournamentNumber: filing?.record.number ?? null,
      tournament: filing?.record.name ?? game.tournament,
      section: filing?.section.name ?? game.section,
      date: game.date,
      round: game.round,
      color,
      score: color === 'white' ? whiteScore : 1 - whiteScore,
      gameId: game._id.toString(),
    });
  }

  return games.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (roundNumber(b.round) ?? 0) - (roundNumber(a.round) ?? 0),
  );
}

// The recorded tournaments the archive files any of the games under
async function recordsFiling(games: PairGame[]): Promise<FilingRecord[]> {
  const names = [...new Set(games.map(({ tournament }) => tournament))];
  return names.length
    ? TournamentModel.find(
        { gameArchiveTournament: { $in: names } },
        {
          number: 1,
          name: 1,
          date: 1,
          gameArchiveTournament: 1,
          'sections.name': 1,
          'sections.gameArchiveSections': 1,
        },
      ).lean<FilingRecord[]>()
    : [];
}
