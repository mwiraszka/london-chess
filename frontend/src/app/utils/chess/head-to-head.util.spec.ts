import { MOCK_HEAD_TO_HEAD_GAMES } from '@app/mocks/games.mock';
import { MOCK_MEMBER_TOURNAMENT_RESULTS } from '@app/mocks/tournaments.mock';
import { MemberTournamentResult } from '@app/models';

import {
  headToHeadGameRow,
  pointsByYear,
  sharedTournamentRow,
  sharedTournaments,
  tallyByColor,
  tallyGames,
  totalPoints,
} from './head-to-head.util';

const NAMES = { first: 'John Doe', second: 'Jane Smith' };

const [championship, fallActive] = MOCK_MEMBER_TOURNAMENT_RESULTS;

function result(
  base: MemberTournamentResult,
  overrides: Partial<MemberTournamentResult>,
): MemberTournamentResult {
  return { ...base, ...overrides };
}

describe('head-to-head utils', () => {
  describe('tallyGames', () => {
    it("should count the first member's wins, draws and losses", () => {
      expect(tallyGames(MOCK_HEAD_TO_HEAD_GAMES)).toEqual({
        wins: 2,
        draws: 1,
        losses: 1,
      });
    });
  });

  describe('tallyByColor', () => {
    it('should split the games by the colour the first member played, leaving out the rest', () => {
      expect(tallyByColor(MOCK_HEAD_TO_HEAD_GAMES)).toEqual({
        white: { wins: 1, draws: 0, losses: 0 },
        black: { wins: 0, draws: 1, losses: 1 },
      });
    });
  });

  describe('totalPoints', () => {
    it("should give each member's points", () => {
      expect(totalPoints(MOCK_HEAD_TO_HEAD_GAMES)).toEqual({ first: 2.5, second: 1.5 });
    });
  });

  describe('pointsByYear', () => {
    it('should give every year from the first game to the last, oldest first', () => {
      expect(pointsByYear(MOCK_HEAD_TO_HEAD_GAMES)).toEqual([
        { year: 2021, firstPoints: 1, secondPoints: 0 },
        { year: 2022, firstPoints: 0, secondPoints: 0 },
        { year: 2023, firstPoints: 0, secondPoints: 1 },
        { year: 2024, firstPoints: 1.5, secondPoints: 0.5 },
      ]);
    });

    it('should give no years without games', () => {
      expect(pointsByYear([])).toEqual([]);
    });
  });

  describe('sharedTournaments', () => {
    it('should pair the tournaments both played, newest first, comparing places within a section', () => {
      const first = [
        result(championship, { rank: 2, section: 'A1' }),
        result(fallActive, { rank: 1 }),
      ];
      const second = [
        result(fallActive, { rank: 3 }),
        result(championship, { rank: 1, section: 'A1' }),
      ];

      const shared = sharedTournaments(first, second);

      expect(shared.map(({ tournament, higher }) => [tournament.number, higher])).toEqual(
        [
          [118, 'second'],
          [90, 'first'],
        ],
      );
    });

    it('should compare the section both played when one of them also played another', () => {
      const first = [
        result(championship, { rank: 1, section: 'Round robin' }),
        result(championship, { rank: 2, section: 'Final' }),
      ];
      const second = [result(championship, { rank: 1, section: 'Final' })];

      const [shared] = sharedTournaments(first, second);

      expect(shared.first.section).toBe('Final');
      expect(shared.higher).toBe('second');
    });

    it('should leave the places of different sections and of simuls uncompared', () => {
      const simul = result(fallActive, {
        tournament: { ...fallActive.tournament, format: 'tandem-simul' },
      });
      const first = [result(championship, { section: 'A1' }), simul];
      const second = [result(championship, { section: 'A2' }), { ...simul, rank: 4 }];

      const shared = sharedTournaments(first, second);

      expect(shared.map(({ higher }) => higher)).toEqual([null, null]);
    });

    it('should leave out the tournaments only one of them played', () => {
      expect(sharedTournaments([championship], [fallActive])).toEqual([]);
    });
  });

  describe('headToHeadGameRow', () => {
    it("should name who had White and who won, from the first member's side", () => {
      const [win, draw, loss, unrecorded] = MOCK_HEAD_TO_HEAD_GAMES.map((game, index) =>
        headToHeadGameRow(game, index, NAMES),
      );

      expect([win.white, win.result, win.winner]).toEqual([
        'John Doe',
        'John Doe won',
        'first',
      ]);
      expect([draw.white, draw.result, draw.winner]).toEqual([
        'Jane Smith',
        'Drawn',
        null,
      ]);
      expect([loss.result, loss.winner]).toEqual(['Jane Smith won', 'second']);
      expect(unrecorded.white).toBe('');
    });

    it('should label the date as far as it was recorded and sort the round by its number', () => {
      const row = headToHeadGameRow(MOCK_HEAD_TO_HEAD_GAMES[3], 3, NAMES);

      expect([row.dateLabel, row.round, row.roundLabel]).toEqual(['2021', 4, '4.2']);
    });
  });

  describe('sharedTournamentRow', () => {
    it("should give each member's place and score, and a simul board only its result", () => {
      const simul = result(fallActive, {
        tournament: { ...fallActive.tournament, format: 'tandem-simul' },
        resultNote: 'draw',
      });

      const [row, simulRow] = [
        sharedTournamentRow(
          {
            tournament: championship.tournament,
            first: result(championship, { rank: 1, playerCount: 8, score: 5.5 }),
            second: result(championship, { rank: 3, playerCount: 8, score: 4 }),
            higher: 'first',
          },
          0,
        ),
        sharedTournamentRow(
          { tournament: simul.tournament, first: simul, second: simul, higher: null },
          1,
        ),
      ];

      expect([row.firstLabel, row.secondLabel]).toEqual(['1 of 8, 5½', '3 of 8, 4']);
      expect(row.firstPlace).toBeLessThan(row.secondPlace ?? 0);
      expect([simulRow.firstLabel, simulRow.firstPlace]).toEqual(['½', null]);
    });
  });
});
