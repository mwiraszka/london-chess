import {
  GamePlayer,
  PgnGame,
  RoundResult,
  Tournament,
  TournamentEntry,
  TournamentGame,
} from '@app/models';

import { mergePgnGames, readPgnGames } from './pgn-import.util';

const player = (id: string, firstName: string, lastName: string): GamePlayer => ({
  id,
  firstName,
  lastName,
  suffix: '',
  memberNumber: null,
});

const ANNA = player('a1', 'Anna', 'Black');
const BORIS = player('b1', 'Boris', 'White');
const CLARA = player('c1', 'Clara', 'Green');
const DAVID = player('d1', 'David', 'Brown');
const JEFFREY = player('j1', 'Jeffrey', 'Bell');
const ELENA = player('e1', 'Élena', 'Núñez');

const played = (
  round: number,
  score: number,
  opponentRank: number | null,
  color: RoundResult['color'],
): RoundResult => ({
  round,
  outcome: 'game',
  scores: [score],
  points: score,
  opponentRank,
  color,
  gameId: null,
});

const entry = (
  rank: number,
  entrant: GamePlayer,
  rounds: RoundResult[] = [],
): TournamentEntry => ({
  rank,
  player: entrant,
  rating: 1500,
  provisionalGames: null,
  performanceRating: null,
  score: rounds.reduce((total, { points }) => total + points, 0),
  tiebreak: null,
  rounds,
  resultNote: '',
});

const archived = (section: string): TournamentGame => ({
  id: `${section}-game`,
  section,
  round: '1',
  date: '2026-09-24',
  white: ANNA,
  black: BORIS,
  result: '1-0',
});

// Two round-robin sections; the youth games played across them are archived as "YS"
const tournament = (): Tournament => ({
  number: 184,
  name: 'Championship',
  subtitle: '',
  date: '2026-09-24',
  endDate: '2026-10-29',
  format: 'round-robin',
  timeControl: 'G85',
  isRated: true,
  articleId: null,
  registrationOpens: null,
  registrationCloses: null,
  registrants: [],
  modificationInfo: null,
  sections: [
    {
      name: 'A1',
      ratingBand: '',
      roundCount: 3,
      isDoubleRound: false,
      entries: [
        entry(1, ANNA, [played(1, 1, 2, 'white')]),
        entry(2, BORIS, [played(1, 0, 1, 'black')]),
        entry(3, JEFFREY),
      ],
      games: [archived('A1'), archived('YS')],
    },
    {
      name: 'A2',
      ratingBand: '',
      roundCount: 3,
      isDoubleRound: false,
      entries: [entry(1, CLARA), entry(2, DAVID), entry(3, ELENA)],
      games: [archived('A2'), archived('YS')],
    },
  ],
});

const pgnGame = (
  tags: Record<string, string>,
  moves = '1. e4 e5 2. Nf3 1-0',
  plyCount = 3,
): PgnGame => ({
  tags: {
    Event: '2026 London Ch A1',
    Date: '2026.10.01',
    Round: '2',
    White: 'Black, Anna',
    Black: 'Bell, Jeffrey',
    Result: '1-0',
    ...tags,
  },
  moves,
  plyCount,
});

describe('readPgnGames', () => {
  it('should read the tags and movetext of every game', () => {
    const text = [
      '﻿[Event "2026 London Ch A1"]',
      '[White "Black, Anna"]',
      '[Black "Bell, Jeffrey"]',
      '[Result "1-0"]',
      '',
      '1. e4 {best by test} e5 (1... c5 2. Nf3) 2. Nf3 $1 Nc6',
      '3. Bb5 1-0',
      '',
      '[Event "2026 London Ch A2"]',
      '[White "Green, \\"Clara\\""]',
      '[Result "1/2-1/2"]',
      '',
      '1. d4 d5 1/2-1/2',
    ].join('\r\n');

    const { games, problems } = readPgnGames(text, 'round-2.pgn');

    expect(problems).toEqual([]);
    expect(games).toEqual([
      {
        tags: {
          Event: '2026 London Ch A1',
          White: 'Black, Anna',
          Black: 'Bell, Jeffrey',
          Result: '1-0',
        },
        moves: '1. e4 {best by test} e5 (1... c5 2. Nf3) 2. Nf3 $1 Nc6 3. Bb5 1-0',
        plyCount: 5,
      },
      {
        tags: { Event: '2026 London Ch A2', White: 'Green, "Clara"', Result: '1/2-1/2' },
        moves: '1. d4 d5 1/2-1/2',
        plyCount: 2,
      },
    ]);
  });

  it('should name a file that holds no games', () => {
    const { games, problems } = readPgnGames('\n  \n', 'empty.pgn');

    expect(games).toEqual([]);
    expect(problems).toEqual(['empty.pgn holds no games.']);
  });

  it('should flag a game whose half-move count disagrees with its PlyCount tag', () => {
    const text =
      '[Round "2"]\n[White "Black, Anna"]\n[Black "Bell, Jeffrey"]\n[PlyCount "4"]\n\n1. e4 e5 2. Nf3 *';

    const { problems } = readPgnGames(text, 'round-2.pgn');

    expect(problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey says it has 4 half-moves, but 3 were read.',
    ]);
  });

  it('should flag a game whose moves end on a different result than its Result tag', () => {
    const text =
      '[Round "2"]\n[White "Black, Anna"]\n[Black "Bell, Jeffrey"]\n[Result "1-0"]\n\n1. e4 e5 0-1 {resigned}';

    const { problems } = readPgnGames(text, 'round-2.pgn');

    expect(problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey ends its moves with 0-1, but its Result tag says 1-0.',
    ]);
  });

  it('should describe a game missing its tags with question marks', () => {
    const { problems } = readPgnGames('[PlyCount "9"]\n\n1. e4 *', 'round-2.pgn');

    expect(problems).toEqual([
      'The round ? game between ? and ? says it has 9 half-moves, but 1 were read.',
    ]);
  });
});

describe('mergePgnGames', () => {
  it('should refuse a tournament with no sections recorded yet', () => {
    const empty = { ...tournament(), sections: [] };

    const result = mergePgnGames(empty, [pgnGame({})]);

    expect(result).toEqual({
      sections: [],
      games: [],
      problems: [
        'Games from a PGN can only be added to a tournament whose sections are already recorded.',
      ],
    });
  });

  it("should add a game to its round for both players and to the section's games", () => {
    const result = mergePgnGames(tournament(), [
      pgnGame({ WhiteElo: '1712', BlackElo: '', ECO: 'C60' }),
    ]);

    expect(result.problems).toEqual([]);
    const [anna, , jeffrey] = result.sections[0].entries;
    expect(anna.rounds).toEqual([
      {
        round: 1,
        outcome: 'game',
        scores: [1],
        points: 1,
        opponentRank: 2,
        color: 'white',
      },
      {
        round: 2,
        outcome: 'game',
        scores: [1],
        points: 1,
        opponentRank: 3,
        color: 'white',
      },
    ]);
    expect(anna.score).toBe(2);
    expect(jeffrey.rounds).toEqual([
      {
        round: 2,
        outcome: 'game',
        scores: [0],
        points: 0,
        opponentRank: 1,
        color: 'black',
      },
    ]);
    expect(jeffrey.score).toBe(0);
    expect(result.games).toEqual([
      {
        section: 'A1',
        round: '2',
        date: '2026-10-01',
        whitePlayerId: 'a1',
        blackPlayerId: 'j1',
        result: '1-0',
        whiteElo: 1712,
        blackElo: null,
        eco: 'C60',
        plyCount: 3,
        moves: '1. e4 e5 2. Nf3 1-0',
      },
    ]);
  });

  it('should carry every section with its recorded players and results', () => {
    const result = mergePgnGames(tournament(), [pgnGame({})]);

    expect(result.sections.map(({ name }) => name)).toEqual(['A1', 'A2']);
    expect(result.sections[1].entries).toEqual([
      expect.objectContaining({
        rank: 1,
        name: 'Green, Clara',
        playerId: 'c1',
        rounds: [],
      }),
      expect.objectContaining({ rank: 2, name: 'Brown, David', playerId: 'd1' }),
      expect.objectContaining({ rank: 3, name: 'Núñez, Élena', playerId: 'e1' }),
    ]);
  });

  it('should replace the result recorded for the same pairing', () => {
    const corrected = pgnGame({
      Round: '1',
      White: 'Black, Anna',
      Black: 'White, Boris',
      Result: '1/2-1/2',
    });

    const result = mergePgnGames(tournament(), [corrected]);

    expect(result.problems).toEqual([]);
    const [anna, boris] = result.sections[0].entries;
    expect(anna.rounds).toEqual([
      expect.objectContaining({ round: 1, scores: [0.5], points: 0.5, opponentRank: 2 }),
    ]);
    expect(boris.rounds).toEqual([
      expect.objectContaining({ round: 1, scores: [0.5], points: 0.5, color: 'black' }),
    ]);
    expect(anna.score).toBe(0.5);
  });

  it('should stop at a game that contradicts the pairing recorded for its round', () => {
    const result = mergePgnGames(tournament(), [
      pgnGame({ Round: '1', White: 'Black, Anna', Black: 'Bell, Jeffrey' }),
    ]);

    expect(result).toEqual({
      sections: [],
      games: [],
      problems: [
        'The round 1 game between Black, Anna and Bell, Jeffrey does not match the pairing already recorded for round 1.',
      ],
    });
  });

  it('should find players whose names are spelt with other accents, case or a shortened first name', () => {
    const result = mergePgnGames(tournament(), [
      pgnGame({ Black: 'BELL, Jeff' }),
      pgnGame({
        Event: '2026 London Ch A2',
        White: 'Nunez, Elena',
        Black: 'Green, Clara',
      }),
    ]);

    expect(result.problems).toEqual([]);
    expect(
      result.games.map(({ whitePlayerId, blackPlayerId }) => [
        whitePlayerId,
        blackPlayerId,
      ]),
    ).toEqual([
      ['a1', 'j1'],
      ['e1', 'c1'],
    ]);
  });

  it('should prefer an exact name over a shortened one', () => {
    const withJeff = tournament();
    withJeff.sections[0].entries.push(entry(4, player('j2', 'Jeff', 'Bell')));

    const result = mergePgnGames(withJeff, [pgnGame({ Black: 'Bell, Jeff' })]);

    expect(result.problems).toEqual([]);
    expect(result.games[0].blackPlayerId).toBe('j2');
  });

  it('should name a player who could be more than one entrant, or none', () => {
    const twoBells = tournament();
    twoBells.sections[0].entries.push(entry(4, player('j3', 'Jeffery', 'Bell')));

    const ambiguous = mergePgnGames(twoBells, [pgnGame({ Black: 'Bell, Jeff' })]);
    const unknown = mergePgnGames(tournament(), [pgnGame({ Black: 'Stranger, Sam' })]);

    expect(ambiguous.problems).toEqual([
      "The round 2 game between Black, Anna and Bell, Jeff: Bell, Jeff could be more than one of the section's players.",
    ]);
    expect(unknown.problems).toEqual([
      'The round 2 game between Black, Anna and Stranger, Sam: Stranger, Sam is not one of the players in section A1.',
    ]);
  });

  it('should only look for players in the sections the event names', () => {
    const result = mergePgnGames(tournament(), [pgnGame({ Black: 'Green, Clara' })]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and Green, Clara: Green, Clara is not one of the players in section A1.',
    ]);
  });

  it("should record a game across sections without an opponent's rank", () => {
    const result = mergePgnGames(tournament(), [
      pgnGame({
        Event: '2026 London Ch YS',
        White: 'Black, Anna',
        Black: 'Green, Clara',
      }),
    ]);

    expect(result.problems).toEqual([]);
    expect(result.sections[0].entries[0].rounds[1]).toEqual(
      expect.objectContaining({ round: 2, opponentRank: null, color: 'white' }),
    );
    expect(result.sections[1].entries[0].rounds).toEqual([
      expect.objectContaining({
        round: 2,
        scores: [0],
        opponentRank: null,
        color: 'black',
      }),
    ]);
    expect(result.games[0].section).toBe('YS');
  });

  it('should name an event that matches no section', () => {
    const result = mergePgnGames(tournament(), [pgnGame({ Event: '2026 London Ch Z9' })]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey is from 2026 London Ch Z9, which matches no section of this tournament.',
    ]);
  });

  it('should put every game of a single-section tournament in that section', () => {
    const single = tournament();
    single.sections = [{ ...single.sections[0], name: '', games: [] }];

    const result = mergePgnGames(single, [pgnGame({ Event: 'Club Championship' })]);

    expect(result.problems).toEqual([]);
    expect(result.games[0].section).toBe('');
  });

  it('should name games that cannot be added', () => {
    const nameless = pgnGame({});
    delete nameless.tags['Black'];

    const result = mergePgnGames(tournament(), [
      nameless,
      pgnGame({}, '', 0),
      pgnGame({ Result: '*' }),
      pgnGame({ Round: '?' }),
      pgnGame({ Round: '4' }),
    ]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and ? does not name both players.',
      'The round 2 game between Black, Anna and Bell, Jeffrey has no moves.',
      'The round 2 game between Black, Anna and Bell, Jeffrey has no result.',
      'The round ? game between Black, Anna and Bell, Jeffrey has no round number.',
      "The round 4 game between Black, Anna and Bell, Jeffrey is from a round past the section's last.",
    ]);
    expect(result.sections).toEqual([]);
  });

  it('should name a game that appears more than once', () => {
    const result = mergePgnGames(tournament(), [pgnGame({}), pgnGame({})]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey appears more than once.',
    ]);
  });

  it("should fall back to the tournament's date and drop tags it cannot read", () => {
    const result = mergePgnGames(tournament(), [
      pgnGame({ Date: '2026.??.??', WhiteElo: 'unrated', ECO: 'Z99', Round: '2.1' }),
    ]);

    expect(result.games[0]).toEqual(
      expect.objectContaining({
        date: '2026-09-24',
        round: '2',
        whiteElo: null,
        eco: '',
      }),
    );
  });
});
