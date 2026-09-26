import { Types } from 'mongoose';

import { GamePlayer } from '../models/game.model';
import {
  RoundResult,
  TournamentEntry,
  TournamentRecord,
} from '../models/tournament.model';
import { resolvePlayers } from './games.service';
import {
  ArchiveGame,
  matchRoundGames,
  toMemberTournamentResults,
  toTournamentResponse,
} from './tournaments.service';

const { find, lean } = vi.hoisted(() => {
  const lean = vi.fn<() => Promise<ArchiveGame[]>>();
  return { lean, find: vi.fn(() => ({ lean })) };
});

vi.mock('../models/game.model', async importOriginal => ({
  ...(await importOriginal<typeof import('../models/game.model')>()),
  GameModel: { find },
}));

vi.mock('./games.service', async importOriginal => ({
  ...(await importOriginal<typeof import('./games.service')>()),
  resolvePlayers: vi.fn(),
}));

const ANN = 'a00000000000000000000001';
const BOB = 'b00000000000000000000002';
const CAT = 'c00000000000000000000003';

const played = (round: number, opponentRank: number, score: number): RoundResult => ({
  round,
  outcome: 'game',
  scores: [score],
  points: score,
  opponentRank,
  color: null,
});

const entry = (
  rank: number,
  playerId: string,
  rounds: RoundResult[] = [],
): TournamentEntry => ({
  rank,
  playerId,
  rating: 1500,
  provisionalGames: null,
  performanceRating: null,
  score: rounds.reduce((total, { points }) => total + points, 0),
  tiebreak: null,
  rounds,
  resultNote: '',
});

const archiveGame = (
  id: string,
  white: string,
  black: string,
  round = '',
  section = 'A1',
): ArchiveGame => ({
  _id: new Types.ObjectId(id),
  section,
  round,
  date: '2023-09-14',
  whitePlayerId: white,
  blackPlayerId: black,
  result: '1-0',
});

const GAME_ONE = 'f00000000000000000000001';
const GAME_TWO = 'f00000000000000000000002';
const GAME_THREE = 'f00000000000000000000003';

describe('matchRoundGames', () => {
  const entries = [
    entry(1, ANN, [played(1, 2, 1), played(2, 3, 1)]),
    entry(2, BOB, [played(1, 1, 0), played(2, 3, 0.5)]),
    entry(3, CAT, [played(2, 1, 0), played(2, 2, 0.5)]),
  ];

  it('should link each result to the one game its pairing played', () => {
    const gameIds = matchRoundGames(entries, [
      archiveGame(GAME_ONE, BOB, ANN),
      archiveGame(GAME_TWO, ANN, CAT),
    ]);

    expect(gameIds.get('1|1')).toBe(GAME_ONE);
    expect(gameIds.get('2|1')).toBe(GAME_ONE);
    expect(gameIds.get('1|2')).toBe(GAME_TWO);
    expect(gameIds.get('3|2')).toBe(GAME_TWO);
    expect(gameIds.has('2|2')).toBe(false);
  });

  it('should tell a pairing met twice apart by round', () => {
    const rematch = [
      entry(1, ANN, [played(1, 2, 1), played(3, 2, 0)]),
      entry(2, BOB, [played(1, 1, 0), played(3, 1, 1)]),
    ];

    const gameIds = matchRoundGames(rematch, [
      archiveGame(GAME_ONE, ANN, BOB, '1.1'),
      archiveGame(GAME_TWO, BOB, ANN, '3'),
    ]);

    expect(gameIds.get('1|1')).toBe(GAME_ONE);
    expect(gameIds.get('1|3')).toBe(GAME_TWO);
  });

  it('should leave a result unlinked when the round cannot tell its games apart', () => {
    const gameIds = matchRoundGames(entries, [
      archiveGame(GAME_ONE, ANN, BOB),
      archiveGame(GAME_TWO, BOB, ANN),
    ]);

    expect(gameIds.has('1|1')).toBe(false);
  });

  it('should skip results without a known opponent', () => {
    const unknown = [
      entry(1, ANN, [{ ...played(1, 2, 1), opponentRank: null }]),
      entry(2, BOB, [{ ...played(1, 1, 0), outcome: 'forfeit' }]),
    ];

    expect(matchRoundGames(unknown, [archiveGame(GAME_ONE, ANN, BOB)]).size).toBe(0);
  });
});

const record = (overrides: Partial<TournamentRecord> = {}): TournamentRecord => ({
  _id: new Types.ObjectId(),
  number: 86,
  name: 'Championship',
  subtitle: '',
  date: '2023-09-14',
  endDate: null,
  format: 'round-robin',
  timeControl: 'G80',
  isRated: true,
  articleUrl: null,
  gameArchiveTournament: 'Club Championship',
  sections: [
    {
      name: 'A1',
      ratingBand: '',
      roundCount: 2,
      isDoubleRound: false,
      gameArchiveSections: ['A1'],
      entries: [entry(1, ANN, [played(1, 2, 1)]), entry(2, BOB, [played(1, 1, 0)])],
    },
    {
      name: 'B1',
      ratingBand: '',
      roundCount: 2,
      isDoubleRound: false,
      gameArchiveSections: ['B1', 'B1 Playoff'],
      entries: [entry(1, CAT)],
    },
  ],
  ...overrides,
});

const player = (id: string, lastName: string): GamePlayer => ({
  id,
  firstName: 'Pat',
  lastName,
  suffix: '',
  memberNumber: null,
});

const UNKNOWN = { firstName: '', lastName: 'Unknown', suffix: '', memberNumber: null };

describe('toTournamentResponse', () => {
  beforeEach(() => {
    vi.mocked(resolvePlayers).mockResolvedValue(
      new Map([
        [ANN, player(ANN, 'Ann')],
        [BOB, player(BOB, 'Bob')],
      ]),
    );
  });

  it('should look for the games in every section the archive keeps them in', async () => {
    lean.mockResolvedValue([]);

    await toTournamentResponse(record());

    expect(find).toHaveBeenCalledWith(
      {
        tournament: 'Club Championship',
        year: 2023,
        section: { $in: ['A1', 'B1', 'B1 Playoff'] },
      },
      expect.any(Object),
    );
  });

  it('should resolve the players and link results to their games', async () => {
    lean.mockResolvedValue([
      archiveGame(GAME_THREE, ANN, CAT, '2', 'B1 Playoff'),
      archiveGame(GAME_ONE, ANN, BOB, '1'),
      archiveGame(GAME_TWO, CAT, ANN, '1', 'B1'),
    ]);

    const response = await toTournamentResponse(record());

    const [sectionA, sectionB] = response.sections;
    expect(response).not.toHaveProperty('gameArchiveTournament');
    expect(sectionA).not.toHaveProperty('gameArchiveSections');
    expect(sectionA.entries[0].player.lastName).toBe('Ann');
    expect(sectionA.entries[0].rounds[0].gameId).toBe(GAME_ONE);
    expect(sectionA.games.map(({ id }) => id)).toEqual([GAME_ONE]);
    expect(sectionB.entries[0].player).toEqual({ id: CAT, ...UNKNOWN });
    expect(sectionB.games.map(({ id }) => id)).toEqual([GAME_TWO, GAME_THREE]);
  });

  it('should not look for games that were never archived', async () => {
    const response = await toTournamentResponse(record({ gameArchiveTournament: null }));

    expect(find).not.toHaveBeenCalled();
    expect(response.sections.every(({ games }) => games.length === 0)).toBe(true);
  });
});

describe('toMemberTournamentResults', () => {
  it("should list the players' entries across sections, newest first", () => {
    const older = record({ number: 50, date: '2022-09-08' });
    const newer = record({ number: 118, date: '2024-09-12', name: 'Rapid' });

    const results = toMemberTournamentResults([older, newer], new Set([ANN, CAT]));

    expect(
      results.map(({ tournament, section, rank }) => [tournament.number, section, rank]),
    ).toEqual([
      [118, 'A1', 1],
      [118, 'B1', 1],
      [50, 'A1', 1],
      [50, 'B1', 1],
    ]);
    expect(results[0]).toMatchObject({
      tournament: {
        name: 'Rapid',
        date: '2024-09-12',
        endDate: null,
        format: 'round-robin',
        timeControl: 'G80',
      },
      roundCount: 2,
      isDoubleRound: false,
      playerCount: 2,
      rating: 1500,
      score: 1,
    });
  });

  it('should have nothing for players without entries', () => {
    expect(toMemberTournamentResults([record()], new Set(['nobody']))).toEqual([]);
  });
});
