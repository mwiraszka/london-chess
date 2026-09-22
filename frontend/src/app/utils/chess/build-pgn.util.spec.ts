import { MOCK_GAMES } from '@app/mocks/games.mock';

import { buildPgn } from './build-pgn.util';

describe('buildPgn', () => {
  it('should head the moves with the game details as PGN tags', () => {
    expect(buildPgn(MOCK_GAMES[0])).toBe(
      `[Event "Fall Open U1800"]
[Site "London"]
[Date "1994.10.??"]
[Round "3"]
[White "Doe, John"]
[Black "Roe, H."]
[Result "1-0"]
[WhiteElo "1850"]
[BlackElo "1990"]
[ECO "B22"]
[Opening "Sicilian Defence, Alapin Variation"]
[Annotator "Doe, J."]
[PlyCount "5"]

1. e4 c5 2. c3 { A comment } 2... d5 3. exd5 1-0
`,
    );
  });

  it('should mark what was never recorded with question marks', () => {
    const pgn = buildPgn(MOCK_GAMES[2]);

    expect(pgn).toContain('[Event "?"]');
    expect(pgn).toContain('[Site "?"]');
    expect(pgn).toContain('[Date "1991.??.??"]');
    expect(pgn).toContain('[Round "?"]');
    expect(pgn).toContain('[White "Public"]');
    expect(pgn).not.toContain('[WhiteElo');
    expect(pgn).not.toContain('[ECO');
    expect(pgn).not.toContain('[Annotator');
  });

  it('should keep a suffix with the surname', () => {
    const pgn = buildPgn({
      ...MOCK_GAMES[1],
      black: {
        ...MOCK_GAMES[1].black,
        firstName: 'J.',
        lastName: 'Charette',
        suffix: 'Sr',
      },
    });

    expect(pgn).toContain('[Black "Charette Sr, J."]');
  });
});
