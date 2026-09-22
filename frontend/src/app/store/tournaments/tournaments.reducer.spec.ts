import {
  MOCK_MEMBER_TOURNAMENT_RESULTS,
  MOCK_TOURNAMENTS,
  MOCK_TOURNAMENT_SUMMARIES,
} from '@app/mocks/tournaments.mock';
import { LccError } from '@app/models';

import * as TournamentsActions from './tournaments.actions';
import { initialState, tournamentsReducer } from './tournaments.reducer';

describe('Tournaments Reducer', () => {
  const mockError: LccError = { name: 'LCCError', message: 'Something went wrong' };

  it('should return the default state for an unknown action', () => {
    expect(tournamentsReducer(initialState, { type: 'Unknown' })).toBe(initialState);
  });

  it('should start with nothing loaded', () => {
    expect(initialState).toEqual({
      ids: [],
      entities: {},
      failedLoads: [],
      summaries: [],
      lastSummariesFetch: null,
      memberResults: {},
    });
  });

  describe('failed loads', () => {
    it('should record each load whose request fails', () => {
      let state = tournamentsReducer(
        initialState,
        TournamentsActions.fetchTournamentsFailed({ error: mockError }),
      );
      state = tournamentsReducer(
        state,
        TournamentsActions.fetchTournamentFailed({ error: mockError }),
      );
      state = tournamentsReducer(
        state,
        TournamentsActions.fetchMemberTournamentsFailed({ error: mockError }),
      );

      expect(state.failedLoads).toEqual(['summaries', 'tournament', 'member-results']);
    });

    it('should forget a failure once the load is attempted again', () => {
      const failed = tournamentsReducer(
        initialState,
        TournamentsActions.fetchTournamentFailed({ error: mockError }),
      );

      const state = tournamentsReducer(
        failed,
        TournamentsActions.fetchTournamentRequested({ tournamentNumber: 90 }),
      );

      expect(state.failedLoads).toEqual([]);
    });
  });

  it('should store the summaries and when they were fetched', () => {
    const state = tournamentsReducer(
      initialState,
      TournamentsActions.fetchTournamentsSucceeded({
        summaries: MOCK_TOURNAMENT_SUMMARIES,
      }),
    );

    expect(state.summaries).toEqual(MOCK_TOURNAMENT_SUMMARIES);
    expect(state.lastSummariesFetch).not.toBeNull();
  });

  it('should store a tournament under its number', () => {
    const state = tournamentsReducer(
      initialState,
      TournamentsActions.fetchTournamentSucceeded({ tournament: MOCK_TOURNAMENTS[0] }),
    );

    expect(state.ids).toEqual([90]);
    expect(state.entities[90]).toEqual(MOCK_TOURNAMENTS[0]);
  });

  it("should store each member's results under their number", () => {
    const first = tournamentsReducer(
      initialState,
      TournamentsActions.fetchMemberTournamentsSucceeded({
        memberNumber: 2,
        results: MOCK_MEMBER_TOURNAMENT_RESULTS,
      }),
    );

    const state = tournamentsReducer(
      first,
      TournamentsActions.fetchMemberTournamentsSucceeded({
        memberNumber: 7,
        results: [],
      }),
    );

    expect(state.memberResults).toEqual({ 2: MOCK_MEMBER_TOURNAMENT_RESULTS, 7: [] });
  });
});
