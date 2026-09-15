import { isGameScore } from './is-game-score.util';

describe('isGameScore', () => {
  it('correctly identifies GameScore-type values', () => {
    expect(isGameScore(undefined)).toBe(false);
    expect(isGameScore(null)).toBe(false);
    expect(isGameScore(true)).toBe(false);
    expect(isGameScore(false)).toBe(false);
    expect(isGameScore({})).toBe(false);
    expect(isGameScore(new Date())).toBe(false);
    expect(isGameScore(1)).toBe(false);
    expect(isGameScore(0)).toBe(false);
    expect(isGameScore('-')).toBe(false);
    expect(isGameScore('2')).toBe(false);
    expect(isGameScore('-1')).toBe(false);
    expect(isGameScore('1 ')).toBe(false);

    expect(isGameScore('1')).toBe(true);
    expect(isGameScore('1/2')).toBe(true);
    expect(isGameScore('0')).toBe(true);
    expect(isGameScore('*')).toBe(true);
  });
});
