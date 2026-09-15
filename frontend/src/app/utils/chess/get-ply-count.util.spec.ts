import { MOCK_PGNS } from '@app/mocks/pgns.mock';

import { getPlyCount } from './get-ply-count.util';

describe('getPlyCount', () => {
  it('returns `undefined` if the PGN is `undefined`', () => {
    expect(getPlyCount()).toBe(undefined);
  });

  it("returns the player's name if it can be found in the PGN", () => {
    expect(getPlyCount(MOCK_PGNS[0])).toBe(57);
    expect(getPlyCount(MOCK_PGNS[1])).toBe(67);
    expect(getPlyCount(MOCK_PGNS[2])).toBe(108);
    expect(getPlyCount(MOCK_PGNS[3])).toBe(67);
  });

  it('returns `undefined` if unable to parse the ply count', () => {
    expect(getPlyCount(MOCK_PGNS[4])).toBe(undefined);
  });
});
