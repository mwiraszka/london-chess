import { INITIAL_GAMES_QUERY } from '@app/constants/games';
import { GamesQuery } from '@app/models';

import { gamesQueryParams, parseGamesQuery } from './games-query.util';

const FULL_QUERY: GamesQuery = {
  page: 3,
  pageSize: 50,
  sortBy: 'moves',
  sortOrder: 'asc',
  filters: {
    player: '64b7f0c2a1d3e4f5a6b7c8d9',
    year: 1994,
    result: '1/2-1/2',
  },
};

describe('parseGamesQuery', () => {
  it('should fall back to the default query for an empty URL', () => {
    expect(parseGamesQuery({})).toEqual(INITIAL_GAMES_QUERY);
  });

  it('should read every parameter', () => {
    expect(
      parseGamesQuery({
        page: '3',
        size: '50',
        sort: 'moves',
        order: 'asc',
        player: '64b7f0c2a1d3e4f5a6b7c8d9',
        year: '1994',
        result: '1/2-1/2',
      }),
    ).toEqual(FULL_QUERY);
  });

  it('should ignore values that are not on offer', () => {
    expect(
      parseGamesQuery({
        page: '0',
        size: '7',
        sort: 'winner',
        order: 'sideways',
        year: 'soon',
        result: '2-0',
      }),
    ).toEqual(INITIAL_GAMES_QUERY);
  });

  it('should take the first of a repeated parameter', () => {
    expect(parseGamesQuery({ year: ['1996', '1997'] }).filters.year).toBe(1996);
  });
});

describe('gamesQueryParams', () => {
  it('should leave the URL empty for the default query', () => {
    expect(gamesQueryParams(INITIAL_GAMES_QUERY)).toEqual({});
  });

  it('should write every parameter that differs from the defaults', () => {
    expect(gamesQueryParams(FULL_QUERY)).toEqual({
      player: '64b7f0c2a1d3e4f5a6b7c8d9',
      year: 1994,
      result: '1/2-1/2',
      sort: 'moves',
      order: 'asc',
      size: 50,
      page: 3,
    });
  });

  it('should round-trip through the URL', () => {
    const params = gamesQueryParams(FULL_QUERY);

    expect(parseGamesQuery(params)).toEqual(FULL_QUERY);
  });
});
