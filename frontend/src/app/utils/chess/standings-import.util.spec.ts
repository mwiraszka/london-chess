import { StandingsSheet } from '@app/models';

import {
  parseRating,
  parseRoundCell,
  parseScore,
  parseStandings,
} from './standings-import.util';

const HEADER = ['#', 'Name', 'Rating', 'Rd 1', 'Rd 2', 'Total', 'T-BH-C1', 'T-BH'];

// Four players over two rounds, as SwissSys exports them
const SECTION_ROWS = [
  HEADER,
  ['1', 'Achyuth, Akshaj', '2048', 'W3 (b)', 'W2 (w)', ' 2.0', '1.5', '2'],
  ['2', 'Collrin, Jack', '1862/7', 'D4 (w)', 'L1 (b)', ' 0.5', '1', '1.5'],
  ['3', 'Oliver-Barrera, Matao', 'unr.', 'L1 (w)', 'H---', ' 0.5', '0.5', '1'],
  ['4', 'Ramirez, Emilio', '2090', 'D2 (b)', 'U---', ' 0.5', '0', '0.5'],
];

const sheet = (name: string, rows: string[][] = SECTION_ROWS): StandingsSheet => ({
  name,
  rows,
});

const withCell = (row: number, column: number, value: string): string[][] =>
  SECTION_ROWS.map((cells, index) =>
    index === row ? cells.map((cell, at) => (at === column ? value : cell)) : cells,
  );

describe('standings import', () => {
  describe('parseRoundCell', () => {
    it('should read a game with its opponent and colour', () => {
      expect(parseRoundCell('W17 (b)', 1, 1)).toEqual({
        round: 1,
        outcome: 'game',
        scores: [1],
        points: 1,
        opponentRank: 17,
        color: 'black',
      });
      expect(parseRoundCell(' d5 (W) ', 2, 1)).toEqual(
        expect.objectContaining({ scores: [0.5], points: 0.5, color: 'white' }),
      );
      expect(parseRoundCell('L2', 3, 1)).toEqual(
        expect.objectContaining({ scores: [0], opponentRank: 2, color: null }),
      );
    });

    it('should read both games of a double round', () => {
      expect(parseRoundCell('WD5', 1, 2)).toEqual(
        expect.objectContaining({ scores: [1, 0.5], points: 1.5, opponentRank: 5 }),
      );
    });

    it('should read forfeits in either notation', () => {
      expect(parseRoundCell('X12', 1, 1)).toEqual(
        expect.objectContaining({ outcome: 'forfeit', points: 1, opponentRank: 12 }),
      );
      expect(parseRoundCell('F12', 1, 1)).toEqual(
        expect.objectContaining({ outcome: 'forfeit', points: 0, opponentRank: 12 }),
      );
      expect(parseRoundCell('W12 (-)', 1, 1)).toEqual(
        expect.objectContaining({ outcome: 'forfeit', scores: [], points: 1 }),
      );
    });

    it('should read byes and unplayed rounds, worth the whole round or half of it', () => {
      expect(parseRoundCell('B---', 1, 1)).toEqual(
        expect.objectContaining({ outcome: 'full-point-bye', points: 1 }),
      );
      expect(parseRoundCell('H---', 1, 2)).toEqual(
        expect.objectContaining({ outcome: 'half-point-bye', points: 1 }),
      );
      expect(parseRoundCell('U---', 1, 1)).toEqual(
        expect.objectContaining({ outcome: 'unplayed', points: 0 }),
      );
      expect(parseRoundCell('Z', 1, 1)).toEqual(
        expect.objectContaining({ outcome: 'unplayed', opponentRank: null }),
      );
    });

    it('should leave an empty cell as a round not yet played', () => {
      expect(parseRoundCell('  ', 1, 1)).toBeNull();
    });

    it('should refuse anything else', () => {
      expect(parseRoundCell('W17x', 1, 1)).toBeUndefined();
      expect(parseRoundCell('won', 1, 1)).toBeUndefined();
      expect(parseRoundCell('Q3', 1, 1)).toBeUndefined();
    });
  });

  describe('parseRating', () => {
    it('should read established, provisional and missing ratings', () => {
      expect(parseRating(' 946')).toEqual({ rating: 946, provisionalGames: null });
      expect(parseRating('1531/7')).toEqual({ rating: 1531, provisionalGames: 7 });
      expect(parseRating('unr.')).toEqual({ rating: null, provisionalGames: null });
      expect(parseRating('')).toEqual({ rating: null, provisionalGames: null });
    });

    it('should refuse anything else', () => {
      expect(parseRating('about 1500')).toBeUndefined();
      expect(parseRating('15000')).toBeUndefined();
    });
  });

  describe('parseScore', () => {
    it('should read whole and half points written any usual way', () => {
      expect(parseScore(' 5.0')).toBe(5);
      expect(parseScore('4,5')).toBe(4.5);
      expect(parseScore('3½')).toBe(3.5);
      expect(parseScore('½')).toBe(0.5);
      expect(parseScore('')).toBeNull();
    });

    it('should refuse anything that is not a count of half points', () => {
      expect(parseScore('4.25')).toBeUndefined();
      expect(parseScore('-1')).toBeUndefined();
      expect(parseScore('five')).toBeUndefined();
    });
  });

  describe('parseStandings', () => {
    it('should read a sheet into a section of ranked entries', () => {
      const { sections, problems } = parseStandings([sheet('A'), sheet('B')]);

      expect(problems).toEqual([]);
      expect(sections.map(({ name }) => name)).toEqual(['A', 'B']);
      expect(sections[0]).toEqual(
        expect.objectContaining({ ratingBand: '', roundCount: 2, isDoubleRound: false }),
      );
      expect(sections[0].entries[1]).toEqual({
        rank: 2,
        name: 'Collrin, Jack',
        playerId: null,
        rating: 1862,
        provisionalGames: 7,
        score: 0.5,
        tiebreak: 1,
        rounds: [
          expect.objectContaining({ round: 1, outcome: 'game', opponentRank: 4 }),
          expect.objectContaining({ round: 2, outcome: 'game', opponentRank: 1 }),
        ],
      });
    });

    it('should leave a lone section unnamed', () => {
      const { sections } = parseStandings([sheet('Sheet1')]);

      expect(sections.map(({ name }) => name)).toEqual(['']);
    });

    it('should find the header below any title rows and ignore blank lines', () => {
      const { sections, problems } = parseStandings([
        sheet('A', [
          ['Fall Rapid, all sections'],
          [],
          ...SECTION_ROWS.slice(0, 3),
          ['', '', ''],
          ...SECTION_ROWS.slice(3),
        ]),
      ]);

      expect(problems).toEqual([]);
      expect(sections[0].entries).toHaveLength(4);
    });

    it('should skip empty sheets', () => {
      const { sections } = parseStandings([sheet('A'), sheet('Notes', [[''], []])]);

      expect(sections).toHaveLength(1);
    });

    it('should number players in order when there is no rank column', () => {
      const { sections } = parseStandings([
        sheet('A', [
          ['Player', 'Points'],
          ['Doe, Jane', '3'],
          ['Roe, Rick', '1'],
        ]),
      ]);

      expect(sections[0].entries.map(({ rank }) => rank)).toEqual([1, 2]);
      expect(sections[0].roundCount).toBe(0);
    });

    it('should name every cell it cannot read', () => {
      const { sections, problems } = parseStandings([sheet('A', withCell(1, 3, 'W3x'))]);

      expect(sections).toEqual([]);
      expect(problems).toEqual([
        'The standings (Achyuth, Akshaj), round 1: "W3x" is not a result the importer can read.',
      ]);
    });

    it('should refuse a total the rounds do not add up to', () => {
      const { problems } = parseStandings([sheet('A', withCell(2, 5, '1.5'))]);

      expect(problems).toEqual([
        'The standings (Collrin, Jack): the rounds add up to 0.5, but the total says 1.5.',
      ]);
    });

    it('should refuse a game the two players record differently', () => {
      const rows = withCell(4, 3, 'W2 (b)').map((cells, index) =>
        index === 4 ? cells.map((cell, at) => (at === 5 ? '1' : cell)) : cells,
      );

      const { problems } = parseStandings([sheet('A', rows)]);

      expect(problems).toEqual([
        'The standings, round 1: Collrin, Jack and Ramirez, Emilio do not show the same game.',
        'The standings, round 1: Ramirez, Emilio and Collrin, Jack do not show the same game.',
      ]);
    });

    it('should only compare the two sides once every line has been read', () => {
      const { problems } = parseStandings([sheet('A', withCell(4, 3, 'W2 (b)'))]);

      expect(problems).toEqual([
        'The standings (Ramirez, Emilio): the rounds add up to 1, but the total says 0.5.',
      ]);
    });

    it('should refuse a pairing with someone who is not listed', () => {
      const rows = withCell(1, 4, 'W9 (w)').map((cells, index) =>
        index === 2
          ? cells.map((cell, at) => (at === 4 ? 'B---' : at === 5 ? '1.5' : cell))
          : cells,
      );

      const { problems } = parseStandings([sheet('A', rows)]);

      expect(problems).toEqual([
        'The standings, round 2: Achyuth, Akshaj is paired with rank 9, who is not listed.',
      ]);
    });

    it('should refuse bad ranks, ratings and scores', () => {
      const rows = [
        HEADER,
        ['first', 'Doe, Jane', '1500', '', '', '0', '', ''],
        ['2', 'Roe, Rick', 'strong', '', '', 'lots', '', ''],
        ['2', 'Poe, Pat', '1400', '', '', '0', '', ''],
      ];

      const { problems } = parseStandings([sheet('A', rows)]);

      expect(problems).toEqual([
        'The standings (Doe, Jane): "first" is not a rank.',
        'The standings (Roe, Rick): "strong" is not a rating.',
        'The standings (Roe, Rick): "lots" is not a score.',
        'The standings lists rank 2 more than once.',
      ]);
    });

    it('should refuse a sheet without a name column or without players', () => {
      const { problems } = parseStandings([
        sheet('A', [
          ['#', 'Rating'],
          ['1', '1500'],
        ]),
        sheet('B', [['#', 'Name']]),
      ]);

      expect(problems).toEqual([
        'Section A has no column headed Name, so its players cannot be found.',
        'Section B lists no players.',
      ]);
    });

    it('should refuse two sections with the same name', () => {
      const { problems } = parseStandings([sheet('A'), sheet(' A ')]);

      expect(problems).toEqual(['More than one section is named A.']);
    });

    it('should refuse a file with nothing in it', () => {
      expect(parseStandings([sheet('A', [])]).problems).toEqual([
        'The file holds no standings.',
      ]);
    });
  });
});
