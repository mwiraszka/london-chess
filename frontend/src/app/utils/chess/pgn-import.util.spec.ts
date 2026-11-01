import {
  GamePlayer,
  PgnGame,
  RoundResult,
  Tournament,
  TournamentEntry,
  TournamentGame,
} from '@app/models';

import { checkPgnGames, readPgnGames } from './pgn-import.util';

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

// Each section's stand-in for the other section's players in the games played across them
const A2_PLAYER = player('p2', 'Player', 'A2');
const A1_PLAYER = player('p1', 'Player', 'A1');

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

const unplayed = (round: number): RoundResult => ({
  round,
  outcome: 'unplayed',
  scores: [],
  points: 0,
  opponentRank: null,
  color: null,
  gameId: null,
});

const entry = (
  rank: number,
  entrant: GamePlayer,
  rounds: RoundResult[] = [],
  rating: number | null = 1500,
): TournamentEntry => ({
  rank,
  player: entrant,
  rating,
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
  roundCount: null,
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
        entry(1, ANNA, [
          played(1, 1, 2, 'white'),
          played(2, 1, 3, 'white'),
          played(3, 1, 4, 'white'),
        ]),
        entry(2, BORIS, [played(1, 0, 1, 'black'), unplayed(2)]),
        entry(3, JEFFREY, [played(2, 0, 1, 'black')]),
        entry(4, A2_PLAYER, [played(3, 0, 1, 'black')], null),
      ],
      games: [archived('A1'), archived('YS')],
    },
    {
      name: 'A2',
      ratingBand: '',
      roundCount: 3,
      isDoubleRound: false,
      entries: [
        entry(1, CLARA, [played(2, 0, 3, 'black'), played(3, 0, 4, 'white')]),
        entry(2, DAVID),
        entry(3, ELENA, [played(2, 1, 1, 'white')]),
        entry(4, A1_PLAYER, [played(3, 1, 1, 'black')], null),
      ],
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

  it('should start a new game at a tag the game already has', () => {
    const text = [
      '[Round "2"]',
      '[White "Black, Anna"]',
      '[Result "1-0"]',
      '[Round "2"]',
      '[White "Bell, Jeffrey"]',
      '[Result "0-1"]',
      '',
      '1. e4 0-1',
    ].join('\n');

    const { games, problems } = readPgnGames(text, 'round-2.pgn');

    expect(problems).toEqual([]);
    expect(games).toEqual([
      {
        tags: { Round: '2', White: 'Black, Anna', Result: '1-0' },
        moves: '',
        plyCount: 0,
      },
      {
        tags: { Round: '2', White: 'Bell, Jeffrey', Result: '0-1' },
        moves: '1. e4 0-1',
        plyCount: 1,
      },
    ]);
  });

  it('should keep a comment that runs to the end of its line once the moves are joined', () => {
    const text = '[Result "1-0"]\n\n1. e4 ; best {by} test\n1... e5 {a;b} 2. Nf3 1-0';

    const { games } = readPgnGames(text, 'round-2.pgn');

    expect(games[0].moves).toBe('1. e4 {best by test} 1... e5 {a;b} 2. Nf3 1-0');
    expect(games[0].plyCount).toBe(3);
  });

  it('should leave out a game that is not finished', () => {
    const text = [
      '[Round "2"]',
      '[Result "*"]',
      '[PlyCount "9"]',
      '',
      '1. e4 *',
      '',
      '[Round "3"]',
      '[Result "1-0"]',
      '',
      '1. d4 1-0',
    ].join('\n');

    const { games, problems } = readPgnGames(text, 'round-2.pgn');

    expect(problems).toEqual([]);
    expect(games.map(({ tags }) => tags['Round'])).toEqual(['3']);
  });

  it('should name a file that holds no games', () => {
    const { games, problems } = readPgnGames('\n  \n', 'empty.pgn');

    expect(games).toEqual([]);
    expect(problems).toEqual(['empty.pgn holds no games.']);
  });

  it('should read moves that come before any tag as a game of their own', () => {
    const result = readPgnGames('1. e4 e5 1-0', 'Moves.pgn');

    expect(result).toEqual({
      games: [{ tags: {}, moves: '1. e4 e5 1-0', plyCount: 2 }],
      problems: [],
    });
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

describe('checkPgnGames', () => {
  it('should refuse a tournament with no sections recorded yet', () => {
    const empty = { ...tournament(), sections: [] };

    const result = checkPgnGames(empty, [pgnGame({})]);

    expect(result).toEqual({
      sections: [],
      games: [],
      problems: [
        'Games from a PGN can only be added to a tournament whose sections are already recorded.',
      ],
    });
  });

  it('should archive a game that matches the standings', () => {
    const result = checkPgnGames(tournament(), [
      pgnGame({ WhiteElo: '1500', BlackElo: '', ECO: 'C60' }),
    ]);

    expect(result.problems).toEqual([]);
    expect(result.games).toEqual([
      {
        section: 'A1',
        round: '2',
        date: '2026-10-01',
        whitePlayerId: 'a1',
        blackPlayerId: 'j1',
        result: '1-0',
        whiteElo: 1500,
        blackElo: null,
        eco: 'C60',
        plyCount: 3,
        moves: '1. e4 e5 2. Nf3 1-0',
      },
    ]);
  });

  it('should leave the recorded results as they are', () => {
    const result = checkPgnGames(tournament(), [pgnGame({})]);

    expect(result.sections).toEqual(checkPgnGames(tournament(), []).sections);
    expect(result.sections.map(({ name }) => name)).toEqual(['A1', 'A2']);
    expect(result.sections[1].entries).toEqual([
      expect.objectContaining({
        rank: 1,
        name: 'Green, Clara',
        playerId: 'c1',
        rounds: [
          expect.objectContaining({ round: 2, points: 0, opponentRank: 3 }),
          expect.objectContaining({ round: 3, points: 0, opponentRank: 4 }),
        ],
      }),
      expect.objectContaining({ rank: 2, name: 'Brown, David', playerId: 'd1' }),
      expect.objectContaining({ rank: 3, name: 'Núñez, Élena', playerId: 'e1' }),
      expect.objectContaining({ rank: 4, name: 'A1, Player', playerId: 'p1' }),
    ]);
  });

  it('should refuse a game whose result differs from the standings', () => {
    const result = checkPgnGames(tournament(), [
      pgnGame({ Round: '1', Black: 'White, Boris', Result: '1/2-1/2' }),
    ]);

    expect(result).toEqual({
      sections: [],
      games: [],
      problems: [
        'The round 1 game between Black, Anna and White, Boris: the standings give Black, Anna 1 in round 1, but the game gives ½.',
      ],
    });
  });

  it('should refuse a game the standings pair differently', () => {
    const result = checkPgnGames(tournament(), [pgnGame({ Round: '1' })]);

    expect(result.problems).toEqual([
      'The round 1 game between Black, Anna and Bell, Jeffrey: the standings pair Black, Anna with White, Boris in round 1, not Bell, Jeffrey.',
    ]);
  });

  it('should refuse a game from a round the standings have no result for', () => {
    const result = checkPgnGames(tournament(), [
      pgnGame({ Round: '3', White: 'White, Boris' }),
    ]);

    expect(result.problems).toEqual([
      'The round 3 game between White, Boris and Bell, Jeffrey: the standings have no result for White, Boris in round 3.',
    ]);
  });

  it('should refuse a game from a round the standings record as not played', () => {
    const result = checkPgnGames(tournament(), [
      pgnGame({ White: 'White, Boris', Black: 'Black, Anna', Result: '0-1' }),
    ]);

    expect(result.problems).toEqual([
      "The round 2 game between White, Boris and Black, Anna: the standings record White, Boris's round 2 as unplayed.",
    ]);
  });

  it('should refuse a game with the colours the other way round from the standings', () => {
    const result = checkPgnGames(tournament(), [
      pgnGame({ White: 'Bell, Jeffrey', Black: 'Black, Anna', Result: '0-1' }),
    ]);

    expect(result.problems).toEqual([
      'The round 2 game between Bell, Jeffrey and Black, Anna: the standings have Bell, Jeffrey playing black in round 2.',
    ]);
  });

  it('should refuse a rating that differs from the standings, but not a tag that gives none', () => {
    const differing = checkPgnGames(tournament(), [pgnGame({ WhiteElo: '1712' })]);
    const unstated = checkPgnGames(tournament(), [
      pgnGame({ WhiteElo: '', BlackElo: '?' }),
    ]);

    expect(differing.problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey: Black, Anna is 1712 in the PGN but 1500 in the standings.',
    ]);
    expect(unstated.problems).toEqual([]);
  });

  it('should name an unrated player on either side of the comparison', () => {
    const unratedJeffrey = tournament();
    unratedJeffrey.sections[0].entries[2].rating = null;

    const claimedRating = checkPgnGames(unratedJeffrey, [pgnGame({ BlackElo: '1400' })]);
    const claimedUnrated = checkPgnGames(tournament(), [pgnGame({ WhiteElo: '0' })]);

    expect(claimedRating.problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey: Bell, Jeffrey is 1400 in the PGN but unrated in the standings.',
    ]);
    expect(claimedUnrated.problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey: Black, Anna is unrated in the PGN but 1500 in the standings.',
    ]);
  });

  it('should refuse a game against a player the standings place in another section', () => {
    const elsewhere = tournament();
    elsewhere.sections[0].entries[2].rounds = [{ ...played(2, 0, null, 'black') }];

    const result = checkPgnGames(elsewhere, [pgnGame({})]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey: the standings pair Bell, Jeffrey with a player from another section in round 2, not Black, Anna.',
    ]);
  });

  it('should name a game from no event in a tournament of several sections', () => {
    const untitled = pgnGame({});
    delete untitled.tags['Event'];

    const result = checkPgnGames(tournament(), [untitled]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey is from an unnamed event, which matches no section of this tournament.',
    ]);
  });

  it('should find players whose names are spelt with other accents, case or a shortened first name', () => {
    const result = checkPgnGames(tournament(), [
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
    const [anna] = withJeff.sections[0].entries;
    anna.rounds[1] = played(2, 1, 5, 'white');
    withJeff.sections[0].entries.push(
      entry(5, player('j2', 'Jeff', 'Bell'), [played(2, 0, 1, 'black')]),
    );

    const result = checkPgnGames(withJeff, [pgnGame({ Black: 'Bell, Jeff' })]);

    expect(result.problems).toEqual([]);
    expect(result.games[0].blackPlayerId).toBe('j2');
  });

  it('should name a player who could be more than one entrant, or none', () => {
    const twoBells = tournament();
    twoBells.sections[0].entries.push(entry(5, player('j3', 'Jeffery', 'Bell')));

    const ambiguous = checkPgnGames(twoBells, [pgnGame({ Black: 'Bell, Jeff' })]);
    const unknown = checkPgnGames(tournament(), [pgnGame({ Black: 'Stranger, Sam' })]);

    expect(ambiguous.problems).toEqual([
      "The round 2 game between Black, Anna and Bell, Jeff: Bell, Jeff could be more than one of the section's players.",
    ]);
    expect(unknown.problems).toEqual([
      'The round 2 game between Black, Anna and Stranger, Sam: Stranger, Sam is not one of the players in section A1.',
    ]);
  });

  it('should only look for players in the sections the event names', () => {
    const result = checkPgnGames(tournament(), [pgnGame({ Black: 'Green, Clara' })]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and Green, Clara: Green, Clara is not one of the players in section A1.',
    ]);
  });

  describe('with a game played across two sections', () => {
    const across = (tags: Record<string, string> = {}): PgnGame =>
      pgnGame({
        Event: '2026 London Ch YS',
        Round: '3',
        White: 'Green, Clara',
        Black: 'Black, Anna',
        Result: '0-1',
        ...tags,
      });

    it("should check it against both players' results with the other section's stand-in", () => {
      const result = checkPgnGames(tournament(), [across()]);

      expect(result.problems).toEqual([]);
      expect(result.games).toEqual([
        expect.objectContaining({
          section: 'YS',
          round: '3',
          whitePlayerId: 'c1',
          blackPlayerId: 'a1',
        }),
      ]);
    });

    it('should refuse it when either section records another result', () => {
      const result = checkPgnGames(tournament(), [across({ Result: '1/2-1/2' })]);

      expect(result.problems).toEqual([
        'The round 3 game between Green, Clara and Black, Anna: the standings give Green, Clara 0 in round 3, but the game gives ½.',
      ]);
    });

    describe('under an event the archive does not know yet', () => {
      // A third section holds a stand-in for A2's players but none for A1's, and a fourth
      // plays no one outside itself
      const withB1 = (): Tournament => {
        const championship = tournament();
        for (const section of championship.sections) {
          section.games = [];
        }
        championship.sections.push({
          name: 'B1',
          ratingBand: '',
          roundCount: 3,
          isDoubleRound: false,
          entries: [
            entry(1, player('f1', 'Fiona', 'Gray'), [played(3, 1, 2, 'white')]),
            entry(2, A2_PLAYER, [played(3, 0, 1, 'black')], null),
          ],
          games: [],
        });
        championship.sections.push({
          name: 'C1',
          ratingBand: '',
          roundCount: 3,
          isDoubleRound: false,
          entries: [entry(1, player('s1', 'Sam', 'Stranger'))],
          games: [],
        });
        return championship;
      };
      const across = (tags: Record<string, string>): PgnGame[] => [
        pgnGame({}),
        pgnGame({ Event: '2026 London Ch AB', Round: '3', ...tags }),
      ];
      const unknownEvent = (white: string, black: string): string =>
        `The round 3 game between ${white} and ${black} is from 2026 London Ch AB, which matches no section of this tournament.`;

      it('should refuse a game between players of one section', () => {
        const result = checkPgnGames(withB1(), across({ Black: 'White, Boris' }));

        expect(result.problems).toEqual([unknownEvent('Black, Anna', 'White, Boris')]);
      });

      it('should refuse a game between sections that hold no stand-in for each other', () => {
        const result = checkPgnGames(withB1(), across({ Black: 'Gray, Fiona' }));

        expect(result.problems).toEqual([unknownEvent('Black, Anna', 'Gray, Fiona')]);
      });

      it('should name a player found in none of the sections that play across', () => {
        const result = checkPgnGames(withB1(), across({ Black: 'Stranger, Sam' }));

        expect(result.problems).toEqual([
          'The round 3 game between Black, Anna and Stranger, Sam: Stranger, Sam is not one of the players in the tournament.',
        ]);
      });
    });

    it('should name its section from the events of the sections already known', () => {
      const unarchived = tournament();
      for (const section of unarchived.sections) {
        section.games = [];
      }

      const withKnownEvent = checkPgnGames(unarchived, [pgnGame({}), across()]);
      const alone = checkPgnGames(unarchived, [across()]);

      expect(withKnownEvent.problems).toEqual([]);
      expect(withKnownEvent.games.map(({ section }) => section)).toEqual(['A1', 'YS']);
      expect(alone.problems).toEqual([
        'The round 3 game between Green, Clara and Black, Anna is from 2026 London Ch YS, which matches no section of this tournament.',
      ]);
    });
  });

  it('should name an event that matches no section', () => {
    const result = checkPgnGames(tournament(), [pgnGame({ Event: '2026 London Ch Z9' })]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey is from 2026 London Ch Z9, which matches no section of this tournament.',
    ]);
  });

  it('should put every game of a single-section tournament in that section', () => {
    const single = tournament();
    single.sections = [{ ...single.sections[0], name: '', games: [] }];

    const result = checkPgnGames(single, [pgnGame({ Event: 'Club Championship' })]);

    expect(result.problems).toEqual([]);
    expect(result.games[0].section).toBe('');
  });

  it('should check a game whose moves went unrecorded without archiving it', () => {
    const matching = checkPgnGames(tournament(), [pgnGame({}, '1-0', 0)]);
    const differing = checkPgnGames(tournament(), [pgnGame({ Result: '0-1' }, '0-1', 0)]);

    expect(matching.problems).toEqual([]);
    expect(matching.games).toEqual([]);
    expect(differing.problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey: the standings give Black, Anna 1 in round 2, but the game gives 0.',
    ]);
  });

  it('should name games that cannot be added', () => {
    const nameless = pgnGame({});
    delete nameless.tags['Black'];

    const result = checkPgnGames(tournament(), [
      nameless,
      pgnGame({ Result: '*' }),
      pgnGame({ Round: '?' }),
      pgnGame({ Round: '4' }),
    ]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and ? does not name both players.',
      'The round 2 game between Black, Anna and Bell, Jeffrey has no result.',
      'The round ? game between Black, Anna and Bell, Jeffrey has no round number.',
      "The round 4 game between Black, Anna and Bell, Jeffrey is from a round past the section's last.",
    ]);
    expect(result.sections).toEqual([]);
  });

  describe('with a section that plays two games a round', () => {
    // Each pairing of the three-round section meets again in rounds 4 to 6
    const doubleRound = (): Tournament => {
      const championship = tournament();
      const [section] = championship.sections;
      const [anna, boris] = section.entries;
      anna.rounds[0] = { ...played(1, 1, 2, 'white'), scores: [1, 0.5], points: 1.5 };
      boris.rounds[0] = { ...played(1, 0, 1, 'black'), scores: [0, 0.5], points: 0.5 };
      return { ...championship, sections: [{ ...section, isDoubleRound: true }] };
    };

    it("should check a pairing's second game against the round's second score", () => {
      const result = checkPgnGames(doubleRound(), [
        pgnGame({
          Round: '4',
          White: 'White, Boris',
          Black: 'Black, Anna',
          Result: '1/2-1/2',
        }),
      ]);

      expect(result.problems).toEqual([]);
      expect(result.games).toEqual([expect.objectContaining({ round: '4' })]);
    });

    it('should refuse a second game whose result differs from the standings', () => {
      const result = checkPgnGames(doubleRound(), [
        pgnGame({ Round: '4', White: 'White, Boris', Black: 'Black, Anna' }),
      ]);

      expect(result.problems).toEqual([
        'The round 4 game between White, Boris and Black, Anna: the standings give White, Boris ½ in round 1, but the game gives 1.',
      ]);
    });

    it('should refuse a second game the standings do not record', () => {
      const result = checkPgnGames(doubleRound(), [
        pgnGame({
          Round: '5',
          White: 'Bell, Jeffrey',
          Black: 'Black, Anna',
          Result: '0-1',
        }),
      ]);

      expect(result.problems).toEqual([
        'The round 5 game between Bell, Jeffrey and Black, Anna: the standings record only one game for Bell, Jeffrey in round 2.',
      ]);
    });

    it("should refuse a game past the section's second round of games", () => {
      const result = checkPgnGames(doubleRound(), [pgnGame({ Round: '7' })]);

      expect(result.problems).toEqual([
        "The round 7 game between Black, Anna and Bell, Jeffrey is from a round past the section's last.",
      ]);
    });
  });

  it('should name a game that appears more than once', () => {
    const result = checkPgnGames(tournament(), [pgnGame({}), pgnGame({})]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and Bell, Jeffrey appears more than once.',
    ]);
  });

  it('should name a game whose two names match the same player', () => {
    const result = checkPgnGames(tournament(), [pgnGame({ Black: 'Black, A' })]);

    expect(result.problems).toEqual([
      'The round 2 game between Black, Anna and Black, A matches both names to the same player.',
    ]);
  });

  it("should fall back to the tournament's date and drop tags it cannot read", () => {
    const unratedJeffrey = tournament();
    unratedJeffrey.sections[0].entries[2].rating = null;

    const result = checkPgnGames(unratedJeffrey, [
      pgnGame({
        Date: '2026.??.??',
        WhiteElo: 'unrated',
        BlackElo: '0',
        ECO: 'Z99',
        Round: '2.1',
      }),
    ]);

    expect(result.problems).toEqual([]);
    expect(result.games[0]).toEqual(
      expect.objectContaining({
        date: '2026-09-24',
        round: '2',
        whiteElo: null,
        blackElo: null,
        eco: '',
      }),
    );
  });
});
