import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { GameModel } from '../src/models/game.model';
import { PlayerModel, PlayerRecord } from '../src/models/player.model';
import {
  RoundResult,
  Tournament,
  TournamentEntry,
  TournamentFormat,
  TournamentModel,
  TournamentSection,
} from '../src/models/tournament.model';
import { ArchiveGame, matchRoundGames } from '../src/services/tournaments.service';
import {
  parseRoundCell,
  reconcileByes,
  withPerformanceRatings,
} from '../src/util/crosstable.util';
import { inferEndDates } from '../src/util/tournament-schedule.util';
import {
  PendingPlayer,
  canonicalPlayer,
  loadMemberMatcher,
  playerKey,
  removeUnreferencedPlayers,
  savePlayers,
} from './shared/players';
import { longest, writeSizing } from './shared/sizing';
import { GAME_ARCHIVE_LINKS } from './tournaments/game-links';
import { TOURNAMENT_PLAYER_MERGES } from './tournaments/players';

// Loads the club's tournament history, exported from its pairing software as a Mac
// Roman CSV with a row per player per tournament, into the tournaments collection. A
// tournament played over several weeks ends on the day the club's calendar implies,
// unless the file dates it with an "event end date" column.
// Players are found by name among those the game archive holds, and new ones are
// linked to members by name. Dry run by default; --apply writes, replacing any
// tournament already stored under the same number.
//
//   npx tsx --env-file=.env scripts/import-tournaments.ts <tournaments.csv> [--apply] [--dev]

const args = process.argv.slice(2);
const csvPath = args.find(arg => !arg.startsWith('--'));
const apply = args.includes('--apply');
const useDevDatabase = args.includes('--dev');

if (!csvPath) {
  console.error('Usage: import-tournaments.ts <tournaments.csv> [--apply] [--dev]');
  process.exit(1);
}

const uri = process.env['MONGODB_URI'];
const database =
  process.env[useDevDatabase ? 'MONGODB_DATABASE' : 'MONGODB_DATABASE_PROD'];
if (!uri || !database) {
  console.error('Missing MongoDB environment variables');
  process.exit(1);
}

const ROUND_COLUMNS = Array.from({ length: 9 }, (_, index) => `Rd ${index + 1}`);

const FORMATS: Record<string, TournamentFormat> = {
  Swiss: 'swiss',
  'Round-robin': 'round-robin',
  Match: 'match',
  Tandem: 'tandem-simul',
};

type Row = Record<string, string> & { line: string };

// Splits the file into rows of cells, honoring quoted cells and the quotes doubled inside them
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') {
        cell += char;
      } else if (text[index + 1] === '"') {
        cell += '"';
        index++;
      } else {
        quoted = false;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      rows.push([...row, cell]);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell !== '' || row.length) {
    rows.push([...row, cell]);
  }
  return rows;
}

function readRows(path: string): Row[] {
  const [header, ...rows] = parseCsv(
    new TextDecoder('macintosh').decode(readFileSync(resolve(path))),
  );
  return rows.map((cells, index) => ({
    ...Object.fromEntries(header.map((name, column) => [name, cells[column] ?? ''])),
    line: String(index + 2),
  }));
}

const numberOrNull = (value: string): number | null =>
  value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  }
  return groups;
}

interface PendingEntry extends Omit<TournamentEntry, 'playerId'> {
  playerKey: string;
}

type PendingSection = Omit<TournamentSection, 'entries'> & { entries: PendingEntry[] };

type PendingTournament = Omit<Tournament, 'id' | 'sections'> & {
  sections: PendingSection[];
};

interface Report {
  unreadCells: string[];
  scoreMismatches: string[];
  reconciledByes: string[];
  linked: string[];
  ambiguous: string[];
}

function readEntry(
  row: Row,
  isSimul: boolean,
  roundValue: number,
  players: Map<string, PendingPlayer>,
  report: Report,
): PendingEntry {
  const name = canonicalPlayer(row['Name'], TOURNAMENT_PLAYER_MERGES);
  const key = playerKey(name);
  if (!players.has(key)) {
    players.set(key, { ...name, memberId: null, gameCount: 0 });
  }

  const rating = row['Rating'].match(/^(\d+)(?:\/(\d+))?$/);
  const score = numberOrNull(row['Total']);
  const cells = ROUND_COLUMNS.map(column => row[column]);

  let rounds: RoundResult[] = [];
  if (!isSimul) {
    cells.forEach((cell, index) => {
      if (cell === '') return;
      const result = parseRoundCell(cell, index + 1, roundValue);
      if (result) {
        rounds.push(result);
      } else {
        report.unreadCells.push(`Line ${row.line}, Rd ${index + 1}: "${cell}"`);
      }
    });

    const reconciled = reconcileByes(rounds, score, roundValue);
    if (!reconciled) {
      report.scoreMismatches.push(`Line ${row.line}: ${row['Name']} (${row['Total']})`);
    } else if (reconciled !== rounds) {
      report.reconciledByes.push(`Line ${row.line}: ${row['Name']}`);
      rounds = reconciled;
    }
  }

  return {
    rank: parseInt(row['Rank'], 10),
    playerKey: key,
    rating: rating ? Number(rating[1]) : null,
    provisionalGames: rating?.[2] ? Number(rating[2]) : null,
    performanceRating: null,
    score,
    tiebreak: numberOrNull(row['T-Buch. cut 1']),
    rounds,
    resultNote: isSimul ? cells[0] : '',
  };
}

function readTournament(
  rows: Row[],
  players: Map<string, PendingPlayer>,
  report: Report,
): PendingTournament {
  const [first] = rows;
  const number = Number(first['event #']);
  const format = FORMATS[first['format']];
  if (!format) {
    throw new Error(`Line ${first.line}: unknown format "${first['format']}"`);
  }
  const link = GAME_ARCHIVE_LINKS[number];

  // A simul whose givers each took their own boards is recorded with the giver on
  // every row, and is shown as a section per giver
  const givers = [...new Set(rows.map(row => row['event2']))].filter(
    subtitle => subtitle !== '',
  );
  const sectionOf = (row: Row): string =>
    format === 'tandem-simul' && givers.length > 1 ? row['event2'] : row['section'];

  const sections = [...groupBy(rows, sectionOf).entries()].map(
    ([name, sectionRows]): PendingSection => {
      const rounds = sectionRows[0]['rounds'];
      const isDoubleRound =
        /double/i.test(rounds) ||
        sectionRows.some(row =>
          ROUND_COLUMNS.some(column => /^[WDL]{2}\d/.test(row[column])),
        );
      const entries = sectionRows.map(row =>
        readEntry(row, format === 'tandem-simul', isDoubleRound ? 2 : 1, players, report),
      );

      return {
        name,
        ratingBand: sectionRows[0]['cut-off'],
        roundCount: parseInt(rounds, 10),
        isDoubleRound,
        gameArchiveSections: link?.sections[name] ?? [],
        entries: withPerformanceRatings(
          entries,
          format === 'round-robin',
          isDoubleRound ? 2 : 1,
        ),
      };
    },
  );

  return {
    number,
    name: first['event'],
    subtitle: givers.join(' / '),
    date: first['event start date'],
    endDate: first['event end date'] || null,
    format,
    timeControl: first['time control'],
    isRated: first['rated'] === 'TRUE',
    articleUrl: rows.find(row => row['website'])?.['website'] ?? null,
    gameArchiveTournament: link?.tournament ?? null,
    sections,
  };
}

const displayName = ({ firstName, lastName, suffix }: PendingPlayer): string =>
  [firstName, lastName, suffix].filter(part => part !== '').join(' ');

function writeTournamentSizing(
  tournaments: PendingTournament[],
  players: Map<string, PendingPlayer>,
): string {
  const sections = tournaments.flatMap(({ sections }) => sections);
  const entries = sections.flatMap(({ entries }) => entries);
  const sizing = {
    // Every name carrying a subtitle, since the site shortens subtitles before showing
    // them, and the longest names without one
    tournaments: [
      ...longest(
        tournaments.filter(({ subtitle }) => subtitle !== ''),
        ({ name, subtitle }) => `${name} (${subtitle})`,
        Infinity,
      ),
      ...longest(
        tournaments.filter(({ subtitle }) => subtitle === ''),
        ({ name }) => name,
      ),
    ].map(({ name, subtitle }) => ({ name, subtitle })),
    timeControls: longest(
      tournaments.map(({ timeControl }) => timeControl),
      timeControl => timeControl,
      3,
    ),
    players: longest([...players.values()], displayName).map(
      ({ firstName, lastName, suffix }) => ({ firstName, lastName, suffix }),
    ),
    sections: longest(
      sections.map(({ name, ratingBand }) => ratingBand || name),
      label => label,
      3,
    ),
    resultNotes: longest(
      entries.map(({ resultNote }) => resultNote),
      note => note,
      3,
    ),
    maxRounds: Math.max(0, ...sections.map(({ roundCount }) => roundCount)),
    maxPlayers: Math.max(
      0,
      ...tournaments.map(
        ({ sections }) =>
          new Set(
            sections.flatMap(({ entries }) => entries.map(({ playerKey }) => playerKey)),
          ).size,
      ),
    ),
    maxSectionPlayers: Math.max(0, ...sections.map(({ entries }) => entries.length)),
    maxRating: Math.max(0, ...entries.map(({ rating }) => rating ?? 0)),
    maxProvisionalGames: Math.max(
      0,
      ...entries.map(({ provisionalGames }) => provisionalGames ?? 0),
    ),
    maxScore: Math.max(0, ...entries.map(({ score }) => score ?? 0)),
    hasDateRanges: tournaments.some(({ endDate }) => endDate !== null),
  };
  return writeSizing({
    file: 'tournament-sizing.ts',
    script: 'import-tournaments.ts',
    purpose:
      'the tournament tables show, so their columns are sized before anything is fetched',
    name: 'TOURNAMENT_SIZING',
    type: 'TournamentSizing',
    value: sizing,
  });
}

// How many of each linked section's results find their game in the archive, using the
// ids of players already stored, so a first import reports only what it can check
async function reportGameLinks(
  tournaments: PendingTournament[],
  storedIds: Map<string, string>,
): Promise<string[]> {
  const lines: string[] = [];
  for (const tournament of tournaments) {
    if (!tournament.gameArchiveTournament) continue;
    const year = Number(tournament.date.slice(0, 4));

    for (const section of tournament.sections) {
      if (!section.gameArchiveSections.length) continue;
      const games = await GameModel.find(
        {
          tournament: tournament.gameArchiveTournament,
          year,
          section: { $in: section.gameArchiveSections },
        },
        { section: 1, round: 1, date: 1, whitePlayerId: 1, blackPlayerId: 1, result: 1 },
      ).lean<ArchiveGame[]>();
      const entries = section.entries.map(({ playerKey: key, ...entry }) => ({
        ...entry,
        playerId: storedIds.get(key) ?? key,
      }));
      const results = entries.flatMap(({ rounds }) =>
        rounds.filter(({ outcome }) => outcome === 'game'),
      ).length;
      const matched = matchRoundGames(entries, games).size;
      lines.push(
        `#${tournament.number} ${section.name || '(one section)'} -> ${section.gameArchiveSections.join(', ')}: ${games.length} games` +
          (results ? `, ${matched} of ${results} results linked` : ''),
      );
    }
  }
  return lines;
}

async function main(): Promise<void> {
  const rows = readRows(csvPath as string);
  const players = new Map<string, PendingPlayer>();
  const report: Report = {
    unreadCells: [],
    scoreMismatches: [],
    reconciledByes: [],
    linked: [],
    ambiguous: [],
  };

  const tournaments = [...groupBy(rows, row => row['event #']).values()].map(eventRows =>
    readTournament(eventRows, players, report),
  );
  const endDates = inferEndDates(
    tournaments.map(({ number, date, format, timeControl, sections }) => ({
      number,
      date,
      format,
      timeControl,
      roundCounts: sections.map(({ roundCount }) => roundCount),
    })),
  );
  for (const tournament of tournaments) {
    tournament.endDate ??= endDates.get(tournament.number) ?? null;
  }

  await mongoose.connect(uri as string, { dbName: database });
  try {
    const matchMember = await loadMemberMatcher();
    const stored = await PlayerModel.find(
      {},
      { firstName: 1, lastName: 1, suffix: 1 },
    ).lean<Pick<PlayerRecord, '_id' | 'firstName' | 'lastName' | 'suffix'>[]>();
    const storedIds = new Map(
      stored.map(record => [playerKey(record), record._id.toString()]),
    );

    for (const [key, player] of players) {
      const match = matchMember(player);
      if (match && 'memberId' in match) {
        player.memberId = match.memberId;
        report.linked.push(key);
      } else if (match) {
        report.ambiguous.push(`${key} matches ${match.ambiguous} members`);
      }
    }

    const entryCount = tournaments.reduce(
      (total, { sections }) =>
        total + sections.reduce((count, { entries }) => count + entries.length, 0),
      0,
    );
    const newPlayers = [...players.keys()].filter(key => !storedIds.has(key));
    const performances = tournaments.flatMap(({ sections }) =>
      sections.flatMap(({ entries }) => entries),
    );
    console.log(
      `Tournaments: ${tournaments.length} (${tournaments[0]?.date} to ${tournaments.at(-1)?.date})`,
    );
    console.log(`Entries: ${entryCount}`);
    console.log(
      `Players: ${players.size} (${players.size - newPlayers.length} already stored, ${newPlayers.length} new; ${report.linked.length} linked to members)`,
    );
    console.log(
      `Performance ratings: ${performances.filter(({ performanceRating }) => performanceRating !== null).length} of ${performances.length} entries, ${performances.filter(({ rating, performanceRating }) => rating === null && performanceRating !== null).length} of them unrated`,
    );
    console.log(
      `Column sizing written to ${writeTournamentSizing(tournaments, players)}`,
    );
    if (report.unreadCells.length)
      console.log(`\nCells not understood:\n  ${report.unreadCells.join('\n  ')}`);
    if (report.scoreMismatches.length)
      console.log(
        `\nResults that do not add up to the total:\n  ${report.scoreMismatches.join('\n  ')}`,
      );
    if (report.reconciledByes.length)
      console.log(
        `\nByes valued from the total:\n  ${report.reconciledByes.join('\n  ')}`,
      );
    console.log(
      `\nLinked to the game archive:\n  ${(await reportGameLinks(tournaments, storedIds)).join('\n  ')}`,
    );
    if (report.ambiguous.length)
      console.log(
        `\nNot linked, several members share the name:\n  ${report.ambiguous.join('\n  ')}`,
      );
    console.log(`\nNew players:\n  ${newPlayers.join('\n  ')}`);

    if (!apply) {
      console.log('\nDry run; pass --apply to write');
      return;
    }

    const ids = await savePlayers(players, { countsGames: false });
    const idOf = (key: string): string => {
      const id = ids.get(key);
      if (!id) throw new Error(`No player was saved for ${key}`);
      return id;
    };
    for (const tournament of tournaments) {
      await TournamentModel.replaceOne(
        { number: tournament.number },
        {
          ...tournament,
          sections: tournament.sections.map(section => ({
            ...section,
            entries: section.entries.map(({ playerKey: key, ...entry }) => ({
              ...entry,
              playerId: idOf(key),
            })),
          })),
        },
        { upsert: true },
      );
    }
    const removed = await removeUnreferencedPlayers();
    console.log(
      `\nWrote ${tournaments.length} tournaments and ${newPlayers.length} new players to ${database}, and removed ${removed} players nothing refers to`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
