import { MOCK_PGNS } from '@app/mocks/pgns.mock';

import { getResultTallies } from './get-result-tallies.util';

describe('getResultTallies', () => {
  it('returns `undefined` if the PGN array is `undefined` or empty', () => {
    expect(getResultTallies(undefined)).toBe(undefined);
    expect(getResultTallies([])).toBe(undefined);
  });

  it('returns a map of results if at least one PGN is provided', () => {
    const resultMap = new Map([
      ['White wins', 1],
      ['Black wins', 1],
      ['Draw', 1],
      ['Inconclusive', 1],
      ['Unknown', 1],
    ]);

    expect(getResultTallies(MOCK_PGNS)).toStrictEqual(resultMap);
  });
});
