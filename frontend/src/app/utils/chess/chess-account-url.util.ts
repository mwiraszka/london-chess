import { RatingPlatform } from '@app/models';

const ACCOUNT_URLS: Record<RatingPlatform, (handle: string) => string> = {
  fide: id => `https://ratings.fide.com/profile/${id}`,
  cfc: id => `https://www.chess.ca/en/ratings/p/?id=${id}`,
  chessCom: username => `https://www.chess.com/member/${username}`,
  lichess: username => `https://lichess.org/@/${username}`,
};

export function chessAccountUrl(platform: RatingPlatform, handle: string): string {
  return ACCOUNT_URLS[platform](handle);
}
