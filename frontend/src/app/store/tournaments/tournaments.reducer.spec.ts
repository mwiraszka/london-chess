import { INITIAL_TOURNAMENT_FORM_DATA } from '@app/constants/tournaments';
import {
  MOCK_MEMBER_TOURNAMENT_RESULTS,
  MOCK_TOURNAMENTS,
  MOCK_TOURNAMENT_SUMMARIES,
  MOCK_UPCOMING_SUMMARY,
  MOCK_UPCOMING_TOURNAMENT,
} from '@app/mocks/tournaments.mock';
import { LccError } from '@app/models';
import { tournamentFormData } from '@app/utils';

import * as TournamentsActions from './tournaments.actions';
import {
  TournamentsState,
  initialState,
  tournamentsReducer,
} from './tournaments.reducer';

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
      formData: {},
      newTournamentFormData: INITIAL_TOURNAMENT_FORM_DATA,
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
      const failed: TournamentsState = {
        ...initialState,
        failedLoads: ['summaries', 'tournament', 'member-results'],
      };

      const state = [
        TournamentsActions.fetchTournamentsRequested(),
        TournamentsActions.fetchTournamentRequested({ tournamentNumber: 90 }),
        TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: 2 }),
      ].reduce(tournamentsReducer, failed);

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

  describe('drafts', () => {
    const withUpcoming = tournamentsReducer(
      initialState,
      TournamentsActions.fetchTournamentSucceeded({
        tournament: MOCK_UPCOMING_TOURNAMENT,
      }),
    );

    it('should build up the draft of a new tournament', () => {
      const first = tournamentsReducer(
        initialState,
        TournamentsActions.formDataChanged({
          tournamentNumber: null,
          formData: { name: 'Winter Blitz' },
        }),
      );

      const state = tournamentsReducer(
        first,
        TournamentsActions.formDataChanged({
          tournamentNumber: null,
          formData: { date: '2026-12-03' },
        }),
      );

      expect(state.newTournamentFormData).toEqual({
        ...INITIAL_TOURNAMENT_FORM_DATA,
        name: 'Winter Blitz',
        date: '2026-12-03',
      });
    });

    it("should start a recorded tournament's draft from its details", () => {
      const state = tournamentsReducer(
        withUpcoming,
        TournamentsActions.formDataChanged({
          tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
          formData: { name: 'Fall Rapid Open' },
        }),
      );

      expect(state.formData[MOCK_UPCOMING_TOURNAMENT.number]).toEqual({
        ...tournamentFormData(MOCK_UPCOMING_TOURNAMENT),
        name: 'Fall Rapid Open',
      });
    });

    it('should drop a draft when it is restored', () => {
      const edited = tournamentsReducer(
        tournamentsReducer(
          withUpcoming,
          TournamentsActions.formDataChanged({
            tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
            formData: { name: 'Changed' },
          }),
        ),
        TournamentsActions.formDataChanged({
          tournamentNumber: null,
          formData: { name: 'New' },
        }),
      );

      let state = tournamentsReducer(
        edited,
        TournamentsActions.formDataRestored({
          tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
        }),
      );
      state = tournamentsReducer(
        state,
        TournamentsActions.formDataRestored({ tournamentNumber: null }),
      );

      expect(state.formData).toEqual({});
      expect(state.newTournamentFormData).toEqual(INITIAL_TOURNAMENT_FORM_DATA);
    });
  });

  describe('refreshing a tournament with a draft', () => {
    const number = MOCK_UPCOMING_TOURNAMENT.number;
    const saved = tournamentFormData(MOCK_UPCOMING_TOURNAMENT);
    const withDraft = (name: string): TournamentsState => ({
      ...tournamentsReducer(
        initialState,
        TournamentsActions.fetchTournamentSucceeded({
          tournament: MOCK_UPCOMING_TOURNAMENT,
        }),
      ),
      formData: { [number]: { ...saved, name } },
    });
    const refresh = TournamentsActions.fetchTournamentSucceeded({
      tournament: { ...MOCK_UPCOMING_TOURNAMENT, timeControl: 'G30+5' },
    });

    it('should keep unsaved edits', () => {
      const state = tournamentsReducer(withDraft('Fall Rapid Open'), refresh);

      expect(state.formData[number]?.name).toBe('Fall Rapid Open');
    });

    it('should let a draft without edits give way to the refreshed tournament', () => {
      const state = tournamentsReducer(withDraft(saved.name), refresh);

      expect(state.formData).toEqual({});
    });
  });

  describe('saving', () => {
    const loaded = {
      ...tournamentsReducer(
        initialState,
        TournamentsActions.fetchTournamentSucceeded({
          tournament: MOCK_UPCOMING_TOURNAMENT,
        }),
      ),
      summaries: [MOCK_UPCOMING_SUMMARY, ...MOCK_TOURNAMENT_SUMMARIES],
      lastSummariesFetch: '2026-09-27T12:00:00.000Z',
      formData: { [MOCK_UPCOMING_TOURNAMENT.number]: INITIAL_TOURNAMENT_FORM_DATA },
      newTournamentFormData: { ...INITIAL_TOURNAMENT_FORM_DATA, name: 'Draft' },
    };

    it('should clear the new draft and mark the list stale once a tournament is added', () => {
      const state = tournamentsReducer(
        loaded,
        TournamentsActions.addTournamentSucceeded({
          tournamentNumber: 185,
          tournamentName: 'Draft',
        }),
      );

      expect(state.newTournamentFormData).toEqual(INITIAL_TOURNAMENT_FORM_DATA);
      expect(state.lastSummariesFetch).toBeNull();
    });

    it('should drop the draft and the stale copy of an updated tournament', () => {
      const state = tournamentsReducer(
        loaded,
        TournamentsActions.updateTournamentSucceeded({
          tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
          tournamentName: 'Fall Rapid',
        }),
      );

      expect(state.formData).toEqual({});
      expect(state.entities[MOCK_UPCOMING_TOURNAMENT.number]).toBeUndefined();
      expect(state.lastSummariesFetch).toBeNull();
    });

    it('should forget a deleted tournament everywhere', () => {
      const state = tournamentsReducer(
        loaded,
        TournamentsActions.deleteTournamentSucceeded({
          tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
          tournamentName: 'Fall Rapid',
        }),
      );

      expect(state.summaries).toEqual(MOCK_TOURNAMENT_SUMMARIES);
      expect(state.entities[MOCK_UPCOMING_TOURNAMENT.number]).toBeUndefined();
      expect(state.formData).toEqual({});
    });

    it('should show the latest registrants on the tournament and in the list', () => {
      const [first] = MOCK_UPCOMING_TOURNAMENT.registrants;

      const state = tournamentsReducer(
        loaded,
        TournamentsActions.withdrawalSucceeded({
          tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
          tournamentName: 'Fall Rapid',
          registrants: [first],
        }),
      );

      expect(state.entities[MOCK_UPCOMING_TOURNAMENT.number]?.registrants).toEqual([
        first,
      ]);
      expect(state.summaries[0].registrationCount).toBe(1);
    });

    it('should count a registration even when the tournament itself is not loaded', () => {
      const state = tournamentsReducer(
        { ...loaded, ids: [], entities: {} },
        TournamentsActions.registrationSucceeded({
          tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
          tournamentName: 'Fall Rapid',
          registrants: [],
        }),
      );

      expect(state.summaries[0].registrationCount).toBe(0);
      expect(state.entities).toEqual({});
    });
  });
});
