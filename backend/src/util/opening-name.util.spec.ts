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
    it('should name the last named position the game reaches', () => {
      const name = openingName('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. h4 1/2-1/2');

      expect(name).toBe('Ruy Lopez: Morphy Defense');
    });

    it('should name a position reached by another move order', () => {
      const name = openingName('1. Nf3 d5 2. d4 Nf6 3. c4 e6 4. Nc3 1-0');

      expect(name).toBe(openingName('1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 1-0'));
      expect(name).toMatch(/^Queen's Gambit Declined/);
    });

    it('should name the line up to a move that cannot be played', () => {
      expect(openingName('1. d4 d5 2. Bf4 Qxh7 0-1')).toBe(
        "Queen's Pawn Game: Accelerated London System",
      );
      expect(openingName('1-0')).toBe('');
    });
  });
});
