import { GamePlayer, GameResult } from '@app/models';

export function playerName({ firstName, lastName, suffix }: GamePlayer): string {
  return [firstName, lastName, suffix].filter(part => part !== '').join(' ');
}

export function playerNameLastFirst({ firstName, lastName, suffix }: GamePlayer): string {
  const given = [firstName, suffix].filter(part => part !== '').join(' ');
  return given ? `${lastName}, ${given}` : lastName;
}

export type PlayerScore = '1' | '½' | '0' | '*';

export function playerScores(result: GameResult): {
  white: PlayerScore;
  black: PlayerScore;
} {
  switch (result) {
    case '1-0':
      return { white: '1', black: '0' };
    case '0-1':
      return { white: '0', black: '1' };
    case '1/2-1/2':
      return { white: '½', black: '½' };
    default:
      return { white: '*', black: '*' };
  }
}

export function resultLabel(result: GameResult): string {
  switch (result) {
    case '1-0':
      return 'White wins';
    case '0-1':
      return 'Black wins';
    case '1/2-1/2':
      return 'Draw';
    default:
      return 'Unfinished';
  }
}
