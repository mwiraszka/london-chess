import { movetextTokens, openingName } from './opening-name.util';

describe('opening names', () => {
  describe('movetextTokens', () => {
    it('should keep only the main line, without numbers, comments, variations or result', () => {
      const tokens = movetextTokens(
        '1. e4 {Best by test} e5 (1... c5 2. Nf3 (2. c3)) 2. Nf3 $1 Nc6 ; a quiet line\n3. Bb5 1-0',
      );

      expect(tokens).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    });
  });

  describe('openingName', () => {
    it('should name the opening of the code that the game follows for longest', () => {
      const name = openingName('C60', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1/2-1/2');

      expect(name).toMatch(/^Ruy Lopez/);
    });

    it("should fall back to the code's first opening, and to nothing without a code", () => {
      const fallback = openingName('C60', '1. d4 d5 0-1');

      expect(fallback).not.toBe('');
      expect(openingName('', '1. e4 e5 1-0')).toBe('');
      expect(openingName('Z99', '1. e4 e5 1-0')).toBe('');
    });
  });
});
