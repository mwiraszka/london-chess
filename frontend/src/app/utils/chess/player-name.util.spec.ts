import { MOCK_GAMES } from '@app/mocks/games.mock';

import { playerName, playerScores, resultLabel } from './player-name.util';

describe('playerName', () => {
  it('should join the parts of a name that are present', () => {
    expect(playerName(MOCK_GAMES[0].white)).toBe('Gerry Litchfield');
    expect(playerName({ ...MOCK_GAMES[0].black, firstName: 'J.', suffix: 'Sr' })).toBe(
      'J. Jung Sr',
    );
    expect(playerName({ ...MOCK_GAMES[0].black, firstName: '' })).toBe('Jung');
  });
});

describe('playerScores', () => {
  it('should split each result into a score per player', () => {
    expect(playerScores('1-0')).toEqual({ white: '1', black: '0' });
    expect(playerScores('0-1')).toEqual({ white: '0', black: '1' });
    expect(playerScores('1/2-1/2')).toEqual({ white: '½', black: '½' });
    expect(playerScores('*')).toEqual({ white: '*', black: '*' });
  });
});

describe('resultLabel', () => {
  it('should describe each result', () => {
    expect(resultLabel('1-0')).toBe('White wins');
    expect(resultLabel('0-1')).toBe('Black wins');
    expect(resultLabel('1/2-1/2')).toBe('Draw');
    expect(resultLabel('*')).toBe('Unfinished');
  });
});
