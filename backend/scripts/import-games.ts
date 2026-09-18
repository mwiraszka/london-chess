import mongoose from 'mongoose';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { GAME_RESULTS, Game, GameModel, GameResult } from '../src/models/game.model';
import { MemberModel, MemberRecord } from '../src/models/member.model';
import { Player, PlayerModel } from '../src/models/player.model';
import {
  ParsedPgn,
  ParsedPlayerName,
  movetextTokens,
  parsePgnDate,
  parsePgnGames,
  parsePlayerName,
} from '../src/util/pgn.util';
import { EVENT_MAPPINGS } from './game-archive/events';
import { PLAYER_MERGES, PLAYER_PAIR_FIXES } from './game-archive/players';

// Loads the club's game archive into the games and players collections, linking
// players to members by name. Dry run by default; --apply writes, and only into
// empty collections unless --replace drops both first.
//
//   npx tsx --env-file=.env scripts/import-games.ts <archive.pgn> [--apply] [--replace] [--dev]

const args = process.argv.slice(2);
const pgnPath = args.find(arg => !arg.startsWith('--'));
const apply = args.includes('--apply');
const replace = args.includes('--replace');
const useDevDatabase = args.includes('--dev');

if (!pgnPath) {
  console.error('Usage: import-games.ts <archive.pgn> [--apply] [--replace] [--dev]');
  process.exit(1);
}

const uri = process.env['MONGODB_URI'];
const database =
  process.env[useDevDatabase ? 'MONGODB_DATABASE' : 'MONGODB_DATABASE_PROD'];
if (!uri || !database) {
  console.error('Missing MongoDB environment variables');
  process.exit(1);
}

const COMPILER = { name: 'Gerry Litchfield', number: 2 };
const LONDON_BY_DEFAULT_FROM = 2016;
const SIZING_FILE = resolve(
  __dirname,
  '../../frontend/src/app/constants/game-archive-sizing.ts',
);
// Enough of the longest values that the widest in the site's font is among them
const SIZING_CANDIDATES = 5;

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

const playerKey = ({ firstName, lastName, suffix }: ParsedPlayerName): string =>
  `${lastName}, ${firstName}${suffix ? ` ${suffix}` : ''}`;

// Repairs games whose White surname was hyphenated: the export kept the first half
// as White and glued the second half onto Black's name
function repairPlayerPair(white: string, black: string): [string, string] {
  const fix = PLAYER_PAIR_FIXES[`${white}|${black}`];
  if (fix) {
    return fix;
  }

  const glued = black.match(/^([^,]+), ([A-Za-z]+)-(.+[a-z])([A-Z][a-z]?)$/);
  if (!white.includes(',') && glued) {
    const [, whiteRest, whiteFirst, blackLast, blackFirst] = glued;
    const dot = (initial: string) => (initial.length === 1 ? `${initial}.` : initial);
    return [
      `${white}-${whiteRest}, ${dot(whiteFirst)}`,
      `${blackLast}, ${dot(blackFirst)}`,
    ];
  }

  return [white, black];
}

function canonicalPlayer(raw: string): ParsedPlayerName {
  const parsed = parsePlayerName(raw);
  const merged = PLAYER_MERGES[playerKey(parsed)];
  return merged ? parsePlayerName(merged) : parsed;
}

interface Opening {
  eco: string;
  name: string;
  moves: string[];
}

// Reads the ECO list, whose names may hold commas inside quotes
function readOpenings(): Opening[] {
  const file = readFileSync(join(__dirname, 'game-archive', 'eco-openings.csv'), 'utf8');

  return file
    .split('\n')
    .slice(1)
    .filter(line => line.trim() !== '')
    .map(line => {
      const cells: string[] = [];
      let cell = '';
      let quoted = false;
      for (const char of line) {
        if (char === '"') {
          quoted = !quoted;
        } else if (char === ',' && !quoted) {
          cells.push(cell);
          cell = '';
        } else {
          cell += char;
        }
      }
      cells.push(cell);
      const [eco, name, moves] = cells;
      return { eco, name: name.split(';')[0].trim(), moves: moves.trim().split(' ') };
    });
}

// The opening whose move sequence the game follows for longest, within its ECO code
function findOpening(openings: Opening[], eco: string, tokens: string[]): string {
  let best: Opening | null = null;
  for (const opening of openings) {
    if (opening.eco !== eco) continue;
    const follows = opening.moves.every((move, index) => tokens[index] === move);
    if (follows && (!best || opening.moves.length > best.moves.length)) {
      best = opening;
    }
  }
  return best?.name ?? openings.find(opening => opening.eco === eco)?.name ?? '';
}

interface ResolvedGame {
  game: Omit<Game, 'id' | 'whitePlayerId' | 'blackPlayerId'>;
  white: string;
  black: string;
}

function resolveGame(
  parsed: ParsedPgn,
  openings: Opening[],
  report: Report,
): ResolvedGame | null {
  const { tags, moves } = parsed;
  const parsedDate = parsePgnDate(tags['Date']) ?? parsePgnDate(tags['EventDate']);
  if (!parsedDate) {
    report.skipped.push(
      `No year: ${tags['White']} vs ${tags['Black']} (${tags['Event']})`,
    );
    return null;
  }

  const result = tags['Result'] as GameResult;
  if (!GAME_RESULTS.includes(result)) {
    report.skipped.push(
      `No result: ${tags['White']} vs ${tags['Black']} (${tags['Event']})`,
    );
    return null;
  }

  const rawEvent = tags['Event'] ?? '';
  const mapping = EVENT_MAPPINGS[rawEvent];
  if (!mapping) {
    report.unmappedEvents.add(rawEvent);
  }
  const location =
    mapping?.location ?? (parsedDate.year >= LONDON_BY_DEFAULT_FROM ? 'London' : '');
  const round =
    tags['Round'] && tags['Round'] !== '?' ? tags['Round'] : (mapping?.round ?? '');

  const [white, black] = repairPlayerPair(tags['White'] ?? '', tags['Black'] ?? '');
  const eco = tags['ECO'] ?? '';
  const elo = (value: string | undefined): number | null =>
    value && /^\d+$/.test(value) ? Number(value) : null;
  const now = new Date().toISOString();

  return {
    white,
    black,
    game: {
      tournament: mapping?.tournament ?? rawEvent,
      section: mapping?.section ?? '',
      location,
      year: parsedDate.year,
      date: parsedDate.date,
      round,
      result,
      whiteElo: elo(tags['WhiteElo']),
      blackElo: elo(tags['BlackElo']),
      eco,
      opening: eco ? findOpening(openings, eco, movetextTokens(moves)) : '',
      plyCount: Number(tags['PlyCount']) || movetextTokens(moves).length,
      moves,
      annotator: tags['Annotator'] ?? '',
      modificationInfo: {
        createdBy: COMPILER.name,
        createdByNumber: COMPILER.number,
        dateCreated: now,
        lastEditedBy: COMPILER.name,
        lastEditedByNumber: COMPILER.number,
        dateLastEdited: now,
      },
    },
  };
}

function longest<T>(items: T[], text: (item: T) => string): T[] {
  const distinct = [...new Map(items.map(item => [text(item), item])).values()];
  return distinct
    .sort((a, b) => text(b).length - text(a).length)
    .slice(0, SIZING_CANDIDATES);
}

function quote(value: string): string {
  const mark = value.includes("'") && !value.includes('"') ? '"' : "'";
  return `${mark}${value.replace(/\\/g, '\\\\').replace(mark, `\\${mark}`)}${mark}`;
}

// Renders a value as a TypeScript literal in the site's prettier style
function render(value: unknown, indent = ''): string {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    return `[\n${value.map(item => `${inner}${render(item, inner)},`).join('\n')}\n${indent}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const fields = Object.entries(value).map(
      ([key, field]) => `${inner}${key}: ${render(field, inner)},`,
    );
    return `{\n${fields.join('\n')}\n${indent}}`;
  }
  return typeof value === 'string' ? quote(value) : String(value);
}

// The widest values the archives table shows, written where the site sizes its
// columns from, so the columns are right before any game is fetched
function writeSizing(games: ResolvedGame[], players: PendingPlayer[]): void {
  const sizing = {
    players: longest(players, ({ firstName, lastName, suffix }) =>
      [firstName, lastName, suffix].filter(part => part !== '').join(' '),
    ).map(({ firstName, lastName, suffix }) => ({ firstName, lastName, suffix })),
    events: longest(
      games.map(({ game }) => ({ tournament: game.tournament, section: game.section })),
      ({ tournament, section }) => `${tournament} ${section}`,
    ),
    openings: longest(
      games
        .filter(({ game }) => game.opening)
        .map(({ game }) => ({ eco: game.eco, name: game.opening })),
      ({ eco, name }) => `${eco} ${name}`,
    ),
    longestGame: Math.max(0, ...games.map(({ game }) => Math.ceil(game.plyCount / 2))),
  };
  writeFileSync(
    SIZING_FILE,
    [
      '// Generated by backend/scripts/import-games.ts from the archive it loads: the',
      '// widest values the game archives table shows, so its columns are sized before',
      '// any game is fetched',
      "import { ArchiveSizing } from '@app/models';",
      '',
      `export const ARCHIVE_SIZING: ArchiveSizing = ${render(sizing)};`,
      '',
    ].join('\n'),
  );
}

interface Report {
  skipped: string[];
  unmappedEvents: Set<string>;
  linked: string[];
  ambiguous: string[];
}

interface PendingPlayer extends Omit<Player, 'id' | 'memberId'> {
  memberId: string | null;
}

async function main(): Promise<void> {
  const text = readFileSync(resolve(pgnPath as string), 'utf8');
  const parsedGames = parsePgnGames(text);
  const openings = readOpenings();
  const report: Report = {
    skipped: [],
    unmappedEvents: new Set(),
    linked: [],
    ambiguous: [],
  };

  const games: ResolvedGame[] = [];
  for (const parsed of parsedGames) {
    const resolved = resolveGame(parsed, openings, report);
    if (resolved) games.push(resolved);
  }

  const players = new Map<string, PendingPlayer>();
  const keyOf = (raw: string): string => {
    const name = canonicalPlayer(raw);
    const key = playerKey(name);
    const player = players.get(key) ?? { ...name, memberId: null, gameCount: 0 };
    player.gameCount++;
    players.set(key, player);
    return key;
  };
  const gameKeys = games.map(({ white, black }) => [keyOf(white), keyOf(black)]);

  await mongoose.connect(uri as string, { dbName: database });
  try {
    const members = await MemberModel.find({}, { firstName: 1, lastName: 1 }).lean<
      Pick<MemberRecord, '_id' | 'firstName' | 'lastName'>[]
    >();
    const membersByName = new Map<string, typeof members>();
    for (const member of members) {
      const key = `${fold(member.firstName)}|${fold(member.lastName)}`;
      membersByName.set(key, [...(membersByName.get(key) ?? []), member]);
    }

    for (const [key, player] of players) {
      if (!player.firstName || player.firstName.endsWith('.')) continue;
      const matches =
        membersByName.get(`${fold(player.firstName)}|${fold(player.lastName)}`) ?? [];
      if (matches.length === 1) {
        player.memberId = matches[0]._id.toString();
        report.linked.push(`${key} (${player.gameCount})`);
      } else if (matches.length > 1) {
        report.ambiguous.push(`${key} matches ${matches.length} members`);
      }
    }

    const initialOnly = [...players.values()].filter(player =>
      player.firstName.endsWith('.'),
    ).length;
    console.log(`Games: ${games.length} of ${parsedGames.length} parsed`);
    console.log(
      `Players: ${players.size} (${report.linked.length} linked to members, ${initialOnly} known by initial only)`,
    );
    console.log(`Tournaments: ${new Set(games.map(({ game }) => game.tournament)).size}`);
    console.log(`Openings named: ${games.filter(({ game }) => game.opening).length}`);
    writeSizing(games, [...players.values()]);
    console.log(`Column sizing written to ${SIZING_FILE}`);
    if (report.skipped.length)
      console.log(`\nSkipped:\n  ${report.skipped.join('\n  ')}`);
    if (report.unmappedEvents.size)
      console.log(
        `\nEvents kept as recorded:\n  ${[...report.unmappedEvents].join('\n  ')}`,
      );
    if (report.ambiguous.length)
      console.log(
        `\nNot linked, several members share the name:\n  ${report.ambiguous.join('\n  ')}`,
      );
    console.log(`\nLinked to members:\n  ${report.linked.join('\n  ')}`);

    if (!apply) {
      console.log('\nDry run; pass --apply to write');
      return;
    }

    if (replace) {
      await Promise.all([GameModel.deleteMany({}), PlayerModel.deleteMany({})]);
    }

    const [existingGames, existingPlayers] = await Promise.all([
      GameModel.countDocuments({}),
      PlayerModel.countDocuments({}),
    ]);
    if (existingGames || existingPlayers) {
      console.error(
        `\nRefusing to import: ${database} already holds ${existingGames} games and ${existingPlayers} players`,
      );
      process.exitCode = 1;
      return;
    }

    const created = await PlayerModel.insertMany([...players.values()]);
    const idsByKey = new Map(
      [...players.keys()].map((key, index) => [key, created[index]._id.toString()]),
    );
    await GameModel.insertMany(
      games.map(({ game }, index) => ({
        ...game,
        whitePlayerId: idsByKey.get(gameKeys[index][0]),
        blackPlayerId: idsByKey.get(gameKeys[index][1]),
      })),
    );
    console.log(
      `\nWrote ${created.length} players and ${games.length} games to ${database}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
