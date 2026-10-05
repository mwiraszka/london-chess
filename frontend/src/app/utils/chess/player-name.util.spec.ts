import { MOCK_GAMES } from '@app/mocks/games.mock';

import {
  isSamePlayerName,
  playerName,
  playerNameLastFirst,
  playerScores,
  resultLabel,
} from './player-name.util';

describe('playerName', () => {
  it('should join the parts of a name that are present', () => {
    expect(playerName(MOCK_GAMES[0].white)).toBe('John Doe');
    expect(playerName({ ...MOCK_GAMES[0].black, firstName: 'J.', suffix: 'Sr' })).toBe(
      'J. Roe Sr',
    );
    expect(playerName({ ...MOCK_GAMES[0].black, firstName: '' })).toBe('Roe');
  });
});

describe('playerNameLastFirst', () => {
  it('should put the surname first', () => {
    expect(playerNameLastFirst(MOCK_GAMES[0].white)).toBe('Doe, John');
    expect(
      playerNameLastFirst({ ...MOCK_GAMES[0].black, firstName: 'J.', suffix: 'Sr' }),
    ).toBe('Roe, J. Sr');
    expect(playerNameLastFirst({ ...MOCK_GAMES[0].black, firstName: '' })).toBe('Roe');
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

describe('isSamePlayerName', () => {
  it('should match names that differ only in accents, case and punctuation', () => {
    expect(isSamePlayerName('Núñez, Élena', 'nunez, ELENA')).toBe(true);
    expect(isSamePlayerName("O'Brien, Mary-Kate", 'OBrien, Mary Kate')).toBe(true);
  });

  it('should not match a different surname or first name', () => {
    expect(isSamePlayerName('Bell, Jeffrey', 'Ball, Jeffrey')).toBe(false);
    expect(isSamePlayerName('Bell, Jeffrey', 'Bell, Jeff')).toBe(false);
  });

  it('should match a shortened first name only when allowed', () => {
    expect(isSamePlayerName('Bell, Jeffrey', 'Bell, Jeff', true)).toBe(true);
    expect(isSamePlayerName('Bell, Jeff', 'Bell, Jeffrey', true)).toBe(true);
    expect(isSamePlayerName('Bell, Jeffrey', 'Bell, Geoffrey', true)).toBe(false);
  });

  it('should treat a name without a comma as a surname alone', () => {
    expect(isSamePlayerName('Bell', 'BELL')).toBe(true);
    expect(isSamePlayerName('Bell', 'Bell, Jeffrey')).toBe(false);
    expect(isSamePlayerName('Bell', 'Bell, Jeffrey', true)).toBe(false);
  });
});
