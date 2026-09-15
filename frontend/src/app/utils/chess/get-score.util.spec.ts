import { MOCK_PGNS } from '@app/mocks/pgns.mock';

import { getScore } from './get-score.util';

describe('getScore', () => {
  it('returns `undefined` if any of the arguments are `undefined`', () => {
    expect(getScore()).toBe(undefined);
    expect(getScore(MOCK_PGNS[0])).toBe(undefined);
    expect(getScore(undefined, 'White')).toBe(undefined);
  });

  it("returns the player's name if it can be found in the PGN", () => {
    expect(getScore(MOCK_PGNS[0], 'White')).toBe('1');
    expect(getScore(MOCK_PGNS[0], 'Black')).toBe('0');
    expect(getScore(MOCK_PGNS[1], 'White')).toBe('1/2');
    expect(getScore(MOCK_PGNS[1], 'Black')).toBe('1/2');
    expect(getScore(MOCK_PGNS[2], 'White')).toBe('0');
    expect(getScore(MOCK_PGNS[2], 'Black')).toBe('1');
    expect(getScore(MOCK_PGNS[3], 'White')).toBe('*');
    expect(getScore(MOCK_PGNS[3], 'Black')).toBe('*');
  });

  it('returns `undefined` if unable to parse the name', () => {
    expect(getScore(MOCK_PGNS[4], 'White')).toBe(undefined);
  });
});
