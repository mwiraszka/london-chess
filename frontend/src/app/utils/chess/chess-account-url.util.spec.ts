import { chessAccountUrl } from './chess-account-url.util';

describe('chessAccountUrl', () => {
  it("should give each site's page for the handle", () => {
    expect(chessAccountUrl('fide', '1503014')).toBe(
      'https://ratings.fide.com/profile/1503014',
    );
    expect(chessAccountUrl('cfc', '150123')).toBe(
      'https://www.chess.ca/en/ratings/p/?id=150123',
    );
    expect(chessAccountUrl('chessCom', 'magnuscarlsen')).toBe(
      'https://www.chess.com/member/magnuscarlsen',
    );
    expect(chessAccountUrl('lichess', 'DrNykterstein')).toBe(
      'https://lichess.org/@/DrNykterstein',
    );
  });
});
