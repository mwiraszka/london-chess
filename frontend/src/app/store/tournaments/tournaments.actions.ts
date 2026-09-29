import { createAction, props } from '@ngrx/store';

import {
  LccError,
  MemberTournamentResult,
  Tournament,
  TournamentFormData,
  TournamentRegistrant,
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

export const addTournamentRequested = createAction(
  '[Tournaments] Add tournament requested',
);
export const addTournamentSucceeded = createAction(
  '[Tournaments] Add tournament succeeded',
  props<{ tournamentNumber: number; tournamentName: string }>(),
);
export const addTournamentFailed = createAction(
  '[Tournaments] Add tournament failed',
  props<{ error: LccError }>(),
);

export const updateTournamentRequested = createAction(
  '[Tournaments] Update tournament requested',
  props<{ tournamentNumber: number }>(),
);
export const updateTournamentSucceeded = createAction(
  '[Tournaments] Update tournament succeeded',
  props<{ tournamentNumber: number; tournamentName: string }>(),
);
export const updateTournamentFailed = createAction(
  '[Tournaments] Update tournament failed',
  props<{ error: LccError }>(),
);

export const deleteTournamentRequested = createAction(
  '[Tournaments] Delete tournament requested',
  props<{ tournamentNumber: number; tournamentName: string }>(),
);
export const deleteTournamentSucceeded = createAction(
  '[Tournaments] Delete tournament succeeded',
  props<{ tournamentNumber: number; tournamentName: string }>(),
);
export const deleteTournamentFailed = createAction(
  '[Tournaments] Delete tournament failed',
  props<{ error: LccError }>(),
);

export const registrationRequested = createAction(
  '[Tournaments] Registration requested',
  props<{ tournamentNumber: number; tournamentName: string }>(),
);
export const registrationSucceeded = createAction(
  '[Tournaments] Registration succeeded',
  props<{
    tournamentNumber: number;
    tournamentName: string;
    registrants: TournamentRegistrant[];
  }>(),
);
export const registrationFailed = createAction(
  '[Tournaments] Registration failed',
  props<{ error: LccError }>(),
);

export const withdrawalRequested = createAction(
  '[Tournaments] Withdrawal requested',
  props<{ tournamentNumber: number; tournamentName: string }>(),
);
export const withdrawalSucceeded = createAction(
  '[Tournaments] Withdrawal succeeded',
  props<{
    tournamentNumber: number;
    tournamentName: string;
    registrants: TournamentRegistrant[];
  }>(),
);
export const withdrawalFailed = createAction(
  '[Tournaments] Withdrawal failed',
  props<{ error: LccError }>(),
);

export const cancelSelected = createAction(
  '[Tournaments] Cancel selected',
  props<{ tournamentNumber: number | null }>(),
);

export const formDataChanged = createAction(
  '[Tournaments] Form data changed',
  props<{ tournamentNumber: number | null; formData: Partial<TournamentFormData> }>(),
);

export const formDataRestored = createAction(
  '[Tournaments] Form data restored',
  props<{ tournamentNumber: number | null }>(),
);
