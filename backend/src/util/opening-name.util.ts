import { ECO_OPENINGS } from './eco-openings';

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

// The opening of the ECO code that the game follows for longest, or the code's first one
export function openingName(eco: string, moves: string): string {
  if (!eco) {
    return '';
  }
  const tokens = movetextTokens(moves);
  let best: (typeof ECO_OPENINGS)[number] | null = null;
  for (const opening of ECO_OPENINGS) {
    const [code, , line] = opening;
    if (code !== eco) continue;
    const lineMoves = line.split(' ');
    const follows = lineMoves.every((move, index) => tokens[index] === move);
    if (follows && (!best || lineMoves.length > best[2].split(' ').length)) {
      best = opening;
    }
  }
  return best?.[1] ?? ECO_OPENINGS.find(([code]) => code === eco)?.[1] ?? '';
}
