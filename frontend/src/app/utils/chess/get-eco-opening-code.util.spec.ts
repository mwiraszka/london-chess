import { MOCK_PGNS } from '@app/mocks/pgns.mock';

import { getEcoOpeningCode } from './get-eco-opening-code.util';

describe('getEcoOpeningCode', () => {
  it('returns `undefined` if the PGN is `undefined`', () => {
    expect(getEcoOpeningCode(undefined)).toBe(undefined);
  });

  it('returns the ECO opening if it can be found in the PGN', () => {
    expect(getEcoOpeningCode(MOCK_PGNS[0])).toBe('A01');
  });

  it('returns "X98" if an opening code cannot be found in the PGN', () => {
    expect(getEcoOpeningCode(MOCK_PGNS[4])).toBe('X98');
  });
});
