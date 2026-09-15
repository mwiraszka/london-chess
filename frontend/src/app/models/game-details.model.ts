/**
 * There are four possible ways of scoring in a chess game:
 *
 * 1 - win;
 * 1/2 - draw;
 * 0 - loss;
 * \* - incomplete/inconclusive
 */
export type GameScore = '1' | '1/2' | '0' | '*';

export interface GameDetails {
  pgn: string;
  whiteFirstName?: string;
  whiteLastName?: string;
  whiteScore?: GameScore;
  blackFirstName?: string;
  blackLastName?: string;
  blackScore?: GameScore;
  plyCount?: number;
}
