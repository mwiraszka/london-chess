import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { GAME_RESULTS, Game, GameModel, GameResult } from '../src/models/game.model';
import {
  ParsedPgn,
  movetextTokens,
  parsePgnDate,
  parsePgnGames,
} from '../src/util/pgn.util';
import { EVENT_MAPPINGS } from './game-archive/events';
import { PLAYER_PAIR_FIXES } from './game-archive/players';
import {
  PendingPlayer,
  canonicalPlayer,
  loadMemberMatcher,
  playerKey,
  removeUnreferencedPlayers,
  savePlayers,
} from './shared/players';
import { longest, writeSizing } from './shared/sizing';

// Loads the club's game archive into the games collection, and its players into the
// players collection by name, linking them to members by name. Dry run by default;
// --apply writes, and only into an empty games collection unless --replace drops the
// games first. Players are kept, so the tournaments that refer to them stay linked.
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

function writeArchiveSizing(games: ResolvedGame[], players: PendingPlayer[]): string {
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
  return writeSizing({
    file: 'game-archive-sizing.ts',
    script: 'import-games.ts',
    purpose:
      'the game archives table shows, so its columns are sized before any game is fetched',
    name: 'ARCHIVE_SIZING',
    type: 'ArchiveSizing',
    value: sizing,
  });
}

interface Report {
  skipped: string[];
  unmappedEvents: Set<string>;
  linked: string[];
  ambiguous: string[];
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
    const matchMember = await loadMemberMatcher();
    for (const [key, player] of players) {
      const match = matchMember(player);
      if (match && 'memberId' in match) {
        player.memberId = match.memberId;
        report.linked.push(`${key} (${player.gameCount})`);
      } else if (match) {
        report.ambiguous.push(`${key} matches ${match.ambiguous} members`);
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
    const sizingFile = writeArchiveSizing(games, [...players.values()]);
    console.log(`Column sizing written to ${sizingFile}`);
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
      await GameModel.deleteMany({});
    }

    const existingGames = await GameModel.countDocuments({});
    if (existingGames) {
      console.error(
        `\nRefusing to import: ${database} already holds ${existingGames} games`,
      );
      process.exitCode = 1;
      return;
    }

    const idsByKey = await savePlayers(players, { countsGames: true });
    await GameModel.insertMany(
      games.map(({ game }, index) => ({
        ...game,
        whitePlayerId: idsByKey.get(gameKeys[index][0]),
        blackPlayerId: idsByKey.get(gameKeys[index][1]),
      })),
    );
    const removed = await removeUnreferencedPlayers();
    console.log(
      `\nWrote ${players.size} players and ${games.length} games to ${database}, and removed ${removed} players nothing refers to`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
