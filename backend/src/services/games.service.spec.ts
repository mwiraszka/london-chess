import {
  buildGamesFilter,
  buildPlayerNameSortPipeline,
  parseGameFilters,
} from './games.service';

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

describe('buildPlayerNameSortPipeline', () => {
  const pipeline = (skip = 0, limit: number | undefined = 25) =>
    buildPlayerNameSortPipeline({ year: 1994 }, 'whitePlayerId', 1, skip, limit);

  it('should filter the games before joining anything', () => {
    expect(Object.keys(pipeline()[0])).toEqual(['$match']);
    expect(pipeline()[0]).toEqual({ $match: { year: 1994 } });
  });

  it('should join the player and the member whose name stands in for theirs', () => {
    const lookups = pipeline()
      .filter(stage => '$lookup' in stage)
      .map(stage => (stage as { $lookup: { from: string } }).$lookup.from);

    expect(lookups).toEqual(['players', 'members']);
  });

  it('should order by the joined name and cut the page after sorting', () => {
    const order = pipeline().map(stage => Object.keys(stage)[0]);

    expect(pipeline().find(stage => '$sort' in stage)).toEqual({
      $sort: { playerSortName: 1, date: -1 },
    });
    expect(order.indexOf('$sort')).toBeLessThan(order.indexOf('$limit'));
    expect(order).toContain('$project');
  });

  it('should order the other way when asked', () => {
    expect(
      buildPlayerNameSortPipeline({}, 'blackPlayerId', -1, 0, 25).find(
        stage => '$sort' in stage,
      ),
    ).toEqual({ $sort: { playerSortName: -1, date: -1 } });
  });

  it('should skip only when a page has been left behind, and take every game without a limit', () => {
    expect(pipeline(0).some(stage => '$skip' in stage)).toBe(false);
    expect(pipeline(50).find(stage => '$skip' in stage)).toEqual({ $skip: 50 });
    expect(
      buildPlayerNameSortPipeline({}, 'whitePlayerId', 1, 0).some(
        stage => '$limit' in stage,
      ),
    ).toBe(false);
  });
});
