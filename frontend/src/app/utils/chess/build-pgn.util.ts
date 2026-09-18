import { Game, GamePlayer } from '@app/models';

const pgnDate = (date: string): string =>
  [...date.split('-'), '??', '??'].slice(0, 3).join('.');

const pgnName = ({ firstName, lastName, suffix }: GamePlayer): string =>
  `${lastName}${suffix ? ` ${suffix}` : ''}${firstName ? `, ${firstName}` : ''}`;

// The game as a PGN document, headed by its current details
export function buildPgn(game: Game): string {
  const event = [game.tournament, game.section].filter(part => part !== '').join(' ');
  const tags: [string, string][] = [
    ['Event', event || '?'],
    ['Site', game.location || '?'],
    ['Date', pgnDate(game.date)],
    ['Round', game.round || '?'],
    ['White', pgnName(game.white)],
    ['Black', pgnName(game.black)],
    ['Result', game.result],
  ];

  if (game.whiteElo !== null) tags.push(['WhiteElo', String(game.whiteElo)]);
  if (game.blackElo !== null) tags.push(['BlackElo', String(game.blackElo)]);
  if (game.eco) tags.push(['ECO', game.eco]);
  if (game.opening) tags.push(['Opening', game.opening]);
  if (game.annotator) tags.push(['Annotator', game.annotator]);
  tags.push(['PlyCount', String(game.plyCount)]);

  const header = tags.map(([name, value]) => `[${name} "${value}"]`).join('\n');

  return `${header}\n\n${game.moves}\n`;
}
