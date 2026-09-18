import { MOCK_GAMES } from '@app/mocks/games.mock';

import { buildPgn } from './build-pgn.util';
import { getLichessAnalysisUrl } from './get-lichess-analysis-url.util';

describe('getLichessAnalysisUrl', () => {
  it('returns `null` if the PGN is `undefined`', () => {
    expect(getLichessAnalysisUrl(undefined)).toBe(null);
  });

  it("returns the game's moves if the PGN contains at least one", () => {
    expect(getLichessAnalysisUrl(buildPgn(MOCK_GAMES[0]))).toBe(
      'https://lichess.org/analysis/pgn/1. e4 c5 2. c3 { A comment } 2... d5 3. exd5 1-0 ',
    );
  });

  it('returns `null` if the PGN does not contain any moves', () => {
    expect(getLichessAnalysisUrl(buildPgn({ ...MOCK_GAMES[0], moves: '*' }))).toBe(null);
  });
});
