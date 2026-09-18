import { buildGamesFilter, parseGameFilters } from './games.service';

const PLAYER_ID = '64b7f0c2a1d3e4f5a6b7c8d9';

describe('parseGameFilters', () => {
  it('should read every supported filter from the query', () => {
    expect(
      parseGameFilters({
        filter_player: PLAYER_ID,
        filter_year: '1994',
        filter_result: '1/2-1/2',
      }),
    ).toEqual({
      player: PLAYER_ID,
      year: 1994,
      result: '1/2-1/2',
    });
  });

  it('should ignore empty, malformed and unknown values', () => {
    expect(
      parseGameFilters({
        filter_player: 'not-an-id',
        filter_year: 'soon',
        filter_result: '2-0',
        filter_colour: 'white',
        page: '3',
      }),
    ).toEqual({});
  });

  it('should take the first value when a filter is repeated', () => {
    expect(parseGameFilters({ filter_year: ['1996', '1997'] })).toEqual({ year: 1996 });
  });
});

describe('buildGamesFilter', () => {
  it('should match every game when nothing is filtered', () => {
    expect(buildGamesFilter({})).toEqual({});
  });

  it('should match a player on either side of the board', () => {
    expect(buildGamesFilter({ player: PLAYER_ID })).toEqual({
      $or: [{ whitePlayerId: PLAYER_ID }, { blackPlayerId: PLAYER_ID }],
    });
  });

  it('should combine filters', () => {
    expect(buildGamesFilter({ player: PLAYER_ID, year: 1994, result: '1-0' })).toEqual({
      $and: [
        { $or: [{ whitePlayerId: PLAYER_ID }, { blackPlayerId: PLAYER_ID }] },
        { year: 1994 },
        { result: '1-0' },
      ],
    });
  });
});
