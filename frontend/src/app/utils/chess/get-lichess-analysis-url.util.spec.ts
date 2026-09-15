import { MOCK_PGNS } from '@app/mocks/pgns.mock';

import { getLichessAnalysisUrl } from './get-lichess-analysis-url.util';

describe('getLichessAnalysisUrl', () => {
  it('returns `null` if the PGN is `undefined`', () => {
    expect(getLichessAnalysisUrl(undefined)).toBe(null);
  });

  it("returns the game's moves if the PGN contains at least one", () => {
    const urlWithMoves = `
      https://lichess.org/analysis/pgn/1. d4 e6 2. c4 f5 3. g3 Nf6 4. Bg2 d5 5. Nf3 c6 6. O-O 1-0
    `;
    expect(getLichessAnalysisUrl(MOCK_PGNS[0])).toBe(
      urlWithMoves.replaceAll('\n', ' ').replace(/\s+/g, ' ').trim(),
    );
  });

  it('returns `null` if the PGN does not contain any moves`', () => {
    expect(getLichessAnalysisUrl(MOCK_PGNS[4])).toBe(null);
  });
});
