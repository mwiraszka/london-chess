import { createAction, props } from '@ngrx/store';

import {
  ArchivePlayer,
  Game,
  GamesQuery,
  GamesSummary,
  Id,
  LccError,
  Tournament,
} from '@app/models';

export const fetchFilteredGamesRequested = createAction(
  '[Games] Fetch filtered games requested',
);
export const fetchFilteredGamesSucceeded = createAction(
  '[Games] Fetch filtered games succeeded',
  props<{ games: Game[]; filteredCount: number }>(),
);
export const fetchFilteredGamesFailed = createAction(
  '[Games] Fetch filtered games failed',
  props<{ error: LccError }>(),
);

export const fetchGameRequested = createAction(
  '[Games] Fetch game requested',
  props<{ gameId: Id }>(),
);
export const fetchGameSucceeded = createAction(
  '[Games] Fetch game succeeded',
  props<{ game: Game }>(),
);
export const fetchGameFailed = createAction(
  '[Games] Fetch game failed',
  props<{ error: LccError }>(),
);

export const fetchArchiveReferenceRequested = createAction(
  '[Games] Fetch archive reference requested',
);
export const fetchArchiveReferenceSucceeded = createAction(
  '[Games] Fetch archive reference succeeded',
  props<{ players: ArchivePlayer[]; tournaments: Tournament[]; summary: GamesSummary }>(),
);
export const fetchArchiveReferenceFailed = createAction(
  '[Games] Fetch archive reference failed',
  props<{ error: LccError }>(),
);

export const randomGameRequested = createAction('[Games] Random game requested');
export const randomGamePicked = createAction(
  '[Games] Random game picked',
  props<{ gameId: Id }>(),
);
export const randomGameFailed = createAction(
  '[Games] Random game failed',
  props<{ error: LccError }>(),
);

export const queryChanged = createAction(
  '[Games] Query changed',
  props<{ query: GamesQuery }>(),
);
