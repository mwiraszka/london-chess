import {
  MOCK_MEMBER_TOURNAMENT_RESULTS,
  MOCK_TOURNAMENTS,
  MOCK_TOURNAMENT_SUMMARIES,
} from '@app/mocks/tournaments.mock';

import {
  TournamentsState,
  initialState,
  tournamentsAdapter,
} from './tournaments.reducer';
import * as TournamentsSelectors from './tournaments.selectors';

describe('Tournaments Selectors', () => {
  const loadedState: TournamentsState = tournamentsAdapter.setAll(MOCK_TOURNAMENTS, {
    ...initialState,
    summaries: MOCK_TOURNAMENT_SUMMARIES,
    lastSummariesFetch: '2026-01-15T10:00:00.000Z',
    memberResults: { 2: MOCK_MEMBER_TOURNAMENT_RESULTS },
  });

  const withState = (tournamentsState: TournamentsState) => ({ tournamentsState });

  it('should select the summaries', () => {
    expect(TournamentsSelectors.selectSummaries(withState(loadedState))).toEqual(
      MOCK_TOURNAMENT_SUMMARIES,
    );
  });

  describe('selectSummariesStatus', () => {
    it('should be loading until the summaries arrive, then loaded', () => {
      expect(TournamentsSelectors.selectSummariesStatus(withState(initialState))).toBe(
        'loading',
      );
      expect(TournamentsSelectors.selectSummariesStatus(withState(loadedState))).toBe(
        'loaded',
      );
    });

    it('should report a failed fetch', () => {
      const failed = { ...initialState, failedLoads: ['summaries' as const] };

      expect(TournamentsSelectors.selectSummariesStatus(withState(failed))).toBe(
        'failed',
      );
    });
  });

  describe('selectTournamentByNumber', () => {
    it('should find a stored tournament', () => {
      expect(
        TournamentsSelectors.selectTournamentByNumber(111)(withState(loadedState)),
      ).toEqual(MOCK_TOURNAMENTS[1]);
    });

    it('should be null for a tournament that is not stored', () => {
      expect(
        TournamentsSelectors.selectTournamentByNumber(5)(withState(loadedState)),
      ).toBeNull();
    });

    it('should report the status of a tournament', () => {
      const failed = { ...initialState, failedLoads: ['tournament' as const] };

      expect(
        TournamentsSelectors.selectTournamentStatus(90)(withState(loadedState)),
      ).toBe('loaded');
      expect(
        TournamentsSelectors.selectTournamentStatus(5)(withState(initialState)),
      ).toBe('loading');
      expect(TournamentsSelectors.selectTournamentStatus(5)(withState(failed))).toBe(
        'failed',
      );
    });
  });

  describe('selectMemberResults', () => {
    it("should find a member's results", () => {
      expect(TournamentsSelectors.selectMemberResults(2)(withState(loadedState))).toEqual(
        MOCK_MEMBER_TOURNAMENT_RESULTS,
      );
    });

    it('should be null for a member whose results have not arrived', () => {
      expect(
        TournamentsSelectors.selectMemberResults(7)(withState(loadedState)),
      ).toBeNull();
    });

    it("should report the status of a member's results", () => {
      const failed = { ...initialState, failedLoads: ['member-results' as const] };

      expect(
        TournamentsSelectors.selectMemberResultsStatus(2)(withState(loadedState)),
      ).toBe('loaded');
      expect(
        TournamentsSelectors.selectMemberResultsStatus(7)(withState(loadedState)),
      ).toBe('loading');
      expect(TournamentsSelectors.selectMemberResultsStatus(7)(withState(failed))).toBe(
        'failed',
      );
    });
  });
});
