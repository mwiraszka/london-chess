import { MOCK_PGNS } from '@app/mocks/pgns.mock';

import { getPlayerName } from './get-player-name.util';

describe('getPlayerName', () => {
  it('returns `undefined` if any of the arguments are `undefined`', () => {
    expect(getPlayerName()).toBe(undefined);
    expect(getPlayerName(MOCK_PGNS[0])).toBe(undefined);
    expect(getPlayerName(MOCK_PGNS[0], 'first')).toBe(undefined);
    expect(getPlayerName(MOCK_PGNS[0], undefined, 'White')).toBe(undefined);
  });

  it("returns the player's name if it can be found in the PGN", () => {
    expect(getPlayerName(MOCK_PGNS[0], 'first', 'White')).toBe('J.');
    expect(getPlayerName(MOCK_PGNS[0], 'first', 'Black')).toBe('G.');
    expect(getPlayerName(MOCK_PGNS[0], 'last', 'White')).toBe('Whiteman');
    expect(getPlayerName(MOCK_PGNS[0], 'last', 'Black')).toBe('Blackley');
    expect(getPlayerName(MOCK_PGNS[0], 'full', 'White')).toBe('J. Whiteman');
    expect(getPlayerName(MOCK_PGNS[0], 'full', 'Black')).toBe('G. Blackley');
  });

  it('returns `undefined` if unable to parse the name', () => {
    expect(getPlayerName(MOCK_PGNS[4], 'full', 'White')).toBe(undefined);
  });
});
