import { MOCK_PGNS } from '@app/mocks/pgns.mock';

import { getOpeningTallies } from './get-opening-tallies.util';

describe('getOpeningTallies', () => {
  it('returns `undefined` if the PGN array is `undefined` or empty', () => {
    expect(getOpeningTallies(undefined)).toBe(undefined);
    expect(getOpeningTallies([])).toBe(undefined);
  });

  it('returns a map of ECO opening codes if at least one PGN is provided', () => {
    const openingMap = new Map([
      ['A01', 2],
      ['C95', 1],
      ['C63', 1],
      ['X98', 1],
    ]);

    expect(getOpeningTallies(MOCK_PGNS)).toStrictEqual(openingMap);
  });
});
