import { PAGE_SIZE_ALL } from '@eagami/ui';

import { Params } from '@angular/router';

import {
  GAMES_PAGE_SIZES,
  GAMES_SORT_FIELDS,
  GAME_RESULTS,
  INITIAL_GAMES_QUERY,
} from '@app/constants/games';
import { GameResult, GamesQuery, GamesSortBy } from '@app/models';

const single = (value: unknown): string => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' || typeof first === 'number' ? String(first) : '';
};

// The games query a URL describes, falling back to the defaults for anything missing
export function parseGamesQuery(params: Params): GamesQuery {
  const page = Number(single(params['page']));
  const pageSize = Number(single(params['size']));
  const sortBy = single(params['sort']) as GamesSortBy;
  const year = Number(single(params['year']));
  const result = single(params['result']) as GameResult;

  return {
    page: Number.isInteger(page) && page > 0 ? page : INITIAL_GAMES_QUERY.page,
    pageSize:
      GAMES_PAGE_SIZES.includes(pageSize) || pageSize === PAGE_SIZE_ALL
        ? pageSize
        : INITIAL_GAMES_QUERY.pageSize,
    sortBy: GAMES_SORT_FIELDS.includes(sortBy) ? sortBy : INITIAL_GAMES_QUERY.sortBy,
    sortOrder: single(params['order']) === 'asc' ? 'asc' : 'desc',
    filters: {
      player: single(params['player']),
      year: Number.isInteger(year) && year > 0 ? year : null,
      result: GAME_RESULTS.includes(result) ? result : '',
    },
  };
}

// The URL parameters for a query, leaving out whatever matches the defaults
export function gamesQueryParams(query: GamesQuery): Params {
  const params: Params = {};
  const { filters } = query;

  if (filters.player) params['player'] = filters.player;
  if (filters.year !== null) params['year'] = filters.year;
  if (filters.result) params['result'] = filters.result;
  if (query.sortBy !== INITIAL_GAMES_QUERY.sortBy) params['sort'] = query.sortBy;
  if (query.sortOrder !== INITIAL_GAMES_QUERY.sortOrder)
    params['order'] = query.sortOrder;
  if (query.pageSize !== INITIAL_GAMES_QUERY.pageSize) params['size'] = query.pageSize;
  if (query.page !== INITIAL_GAMES_QUERY.page) params['page'] = query.page;

  return params;
}
