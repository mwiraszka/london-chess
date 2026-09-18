import { createFeatureSelector, createSelector } from '@ngrx/store';

import { Id } from '@app/models';
import { loadStatus } from '@app/utils';

import { GamesState, gamesAdapter } from './games.reducer';

const selectGamesState = createFeatureSelector<GamesState>('gamesState');

const selectFailedLoads = createSelector(selectGamesState, state => state.failedLoads);

export const selectLastFilteredFetch = createSelector(
  selectGamesState,
  state => state.lastFilteredFetch,
);

export const selectLastReferenceFetch = createSelector(
  selectGamesState,
  state => state.lastReferenceFetch,
);

export const selectQuery = createSelector(selectGamesState, state => state.query);

export const selectFilteredGames = createSelector(
  selectGamesState,
  state => state.filteredGames,
);

export const selectFilteredCount = createSelector(
  selectGamesState,
  state => state.filteredCount,
);

export const selectPlayers = createSelector(selectGamesState, state => state.players);

export const selectTournaments = createSelector(
  selectGamesState,
  state => state.tournaments,
);

export const selectSummary = createSelector(selectGamesState, state => state.summary);

const { selectEntities: selectGameEntities } =
  gamesAdapter.getSelectors(selectGamesState);

export const selectGameById = (id: Id) =>
  createSelector(selectGameEntities, entities => entities[id] ?? null);

export const selectFilteredGamesStatus = createSelector(
  selectLastFilteredFetch,
  selectFailedLoads,
  (lastFetch, failedLoads) =>
    loadStatus(lastFetch !== null, failedLoads.includes('filtered')),
);

export const selectReferenceStatus = createSelector(
  selectLastReferenceFetch,
  selectFailedLoads,
  (lastFetch, failedLoads) =>
    loadStatus(lastFetch !== null, failedLoads.includes('reference')),
);

export const selectGameStatus = (id: Id) =>
  createSelector(selectGameById(id), selectFailedLoads, (game, failedLoads) =>
    loadStatus(!!game, failedLoads.includes('game')),
  );

// Where a game sits within all the results of the current query
export const selectGamePosition = (id: Id) =>
  createSelector(
    selectFilteredGames,
    selectFilteredCount,
    selectQuery,
    (games, count, { page, pageSize }) => {
      const index = games.findIndex(game => game.id === id);
      return index >= 0 && count !== null
        ? { number: (page - 1) * pageSize + index + 1, count }
        : null;
    },
  );

// The games either side of one within the current results
export const selectAdjacentGameIds = (id: Id) =>
  createSelector(selectFilteredGames, games => {
    const index = games.findIndex(game => game.id === id);
    return {
      previous: index > 0 ? games[index - 1].id : null,
      next: index >= 0 && index < games.length - 1 ? games[index + 1].id : null,
    };
  });
