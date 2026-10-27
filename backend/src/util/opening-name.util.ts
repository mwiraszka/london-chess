import { Chess } from 'chess.js';

import { OPENING_PLY_LIMIT, OPENING_POSITIONS } from './opening-positions';

// The moves of the main line, without move numbers, comments, variations or the result
export function movetextTokens(moves: string): string[] {
  let text = moves.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  while (/\([^()]*\)/.test(text)) {
    text = text.replace(/\([^()]*\)/g, ' ');
  }
  return text
    .split(/\s+/)
    .filter(
      token =>
        token !== '' &&
        !/^\d+\.+$/.test(token) &&
        !/^\$\d+$/.test(token) &&
        !['1-0', '0-1', '1/2-1/2', '*'].includes(token),
    )
    .map(token => token.replace(/^\d+\.+/, ''));
}

let openingsByPosition: Map<string, string> | null = null;

// The board, side to move, castling rights and en passant square, without the move counts
const positionOf = (chess: Chess): string => chess.fen().split(' ').slice(0, 4).join(' ');

/**
 * The opening of the last named position the game reaches, so a game that gets there by
 * another move order still finds it.
 */
export function openingName(moves: string): string {
  openingsByPosition ??= new Map(OPENING_POSITIONS);
  const chess = new Chess();
  let name = '';
  for (const move of movetextTokens(moves).slice(0, OPENING_PLY_LIMIT)) {
    try {
      chess.move(move);
    } catch {
      // A move that cannot be played ends the line the game is named from
      break;
    }
    name = openingsByPosition.get(positionOf(chess)) ?? name;
  }
  return name;
}
