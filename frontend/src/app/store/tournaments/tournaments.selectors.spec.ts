import { INITIAL_TOURNAMENT_FORM_DATA } from '@app/constants/tournaments';
import {
  MOCK_MEMBER_TOURNAMENT_RESULTS,
  MOCK_TOURNAMENTS,
  MOCK_TOURNAMENT_SUMMARIES,
  MOCK_UPCOMING_TOURNAMENT,
} from '@app/mocks/tournaments.mock';
import { tournamentFormData } from '@app/utils';

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

  describe('drafts', () => {
    const number = MOCK_UPCOMING_TOURNAMENT.number;
    const withUpcoming: TournamentsState = tournamentsAdapter.setAll(
      [MOCK_UPCOMING_TOURNAMENT],
      initialState,
    );

    it('should start from the recorded details, or a blank tournament', () => {
      expect(
        TournamentsSelectors.selectTournamentFormData(number)(withState(withUpcoming)),
      ).toEqual(tournamentFormData(MOCK_UPCOMING_TOURNAMENT));
      expect(
        TournamentsSelectors.selectTournamentFormData(null)(withState(withUpcoming)),
      ).toBe(INITIAL_TOURNAMENT_FORM_DATA);
    });

    it('should only see unsaved changes once a draft differs from what is recorded', () => {
      const unchanged = {
        ...withUpcoming,
        formData: { [number]: tournamentFormData(MOCK_UPCOMING_TOURNAMENT) },
      };
      const renamed = {
        ...withUpcoming,
        formData: {
          [number]: { ...tournamentFormData(MOCK_UPCOMING_TOURNAMENT), name: 'Renamed' },
        },
        newTournamentFormData: { ...INITIAL_TOURNAMENT_FORM_DATA, name: 'New' },
      };

      expect(
        TournamentsSelectors.selectHasUnsavedChanges(number)(withState(unchanged)),
      ).toBe(false);
      expect(
        TournamentsSelectors.selectHasUnsavedChanges(null)(withState(unchanged)),
      ).toBe(false);
      expect(
        TournamentsSelectors.selectHasUnsavedChanges(number)(withState(renamed)),
      ).toBe(true);
      expect(TournamentsSelectors.selectHasUnsavedChanges(null)(withState(renamed))).toBe(
        true,
      );
    });
  });
});
