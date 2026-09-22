import { createAction, props } from '@ngrx/store';

import {
  LccError,
  MemberTournamentResult,
  Tournament,
  TournamentSummary,
} from '@app/models';

export const fetchTournamentsRequested = createAction(
  '[Tournaments] Fetch tournaments requested',
);
export const fetchTournamentsSucceeded = createAction(
  '[Tournaments] Fetch tournaments succeeded',
  props<{ summaries: TournamentSummary[] }>(),
);
export const fetchTournamentsFailed = createAction(
  '[Tournaments] Fetch tournaments failed',
  props<{ error: LccError }>(),
);

export const fetchTournamentRequested = createAction(
  '[Tournaments] Fetch tournament requested',
  props<{ tournamentNumber: number }>(),
);
export const fetchTournamentSucceeded = createAction(
  '[Tournaments] Fetch tournament succeeded',
  props<{ tournament: Tournament }>(),
);
export const fetchTournamentFailed = createAction(
  '[Tournaments] Fetch tournament failed',
  props<{ error: LccError }>(),
);

export const fetchMemberTournamentsRequested = createAction(
  '[Tournaments] Fetch member tournaments requested',
  props<{ memberNumber: number }>(),
);
export const fetchMemberTournamentsSucceeded = createAction(
  '[Tournaments] Fetch member tournaments succeeded',
  props<{ memberNumber: number; results: MemberTournamentResult[] }>(),
);
export const fetchMemberTournamentsFailed = createAction(
  '[Tournaments] Fetch member tournaments failed',
  props<{ error: LccError }>(),
);
