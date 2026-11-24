import { Types } from 'mongoose';

import { Id } from '../models/core.model';
import { GameModel, GameRecord } from '../models/game.model';
import { ModificationInfo } from '../models/modification-info.model';
import { PlayerModel } from '../models/player.model';
import {
  ArchivedGameSummary,
  GameChange,
  GameInput,
  TournamentSection,
} from '../models/tournament.model';
import { openingName } from '../util/opening-name.util';
import { UNKNOWN_PLAYER, resolvePlayers } from './games.service';
import { personPlayerIds } from './tournament-players.service';
import { gamesLinkedElsewhere, roundNumber } from './tournaments.service';

type StoredGame = Pick<
  GameRecord,
  | '_id'
  | 'tournament'
  | 'year'
  | 'section'
  | 'round'
  | 'date'
  | 'whitePlayerId'
  | 'blackPlayerId'
  | 'result'
  | 'whiteElo'
  | 'blackElo'
  | 'eco'
  | 'plyCount'
  | 'moves'
  | 'notCounted'
  | 'notCountedReason'
  | 'modificationInfo'
>;

const STORED_GAME_FIELDS = {
  tournament: 1,
  year: 1,
  section: 1,
  round: 1,
  date: 1,
  whitePlayerId: 1,
  blackPlayerId: 1,
  result: 1,
  whiteElo: 1,
  blackElo: 1,
  eco: 1,
  plyCount: 1,
  moves: 1,
  notCounted: 1,
  notCountedReason: 1,
  modificationInfo: 1,
};

// Where the archive files a game: its event and year as well as its section and round
interface Filing {
  tournament: string;
  year: number;
}

type GameKey = Pick<GameRecord, 'section' | 'round' | 'whitePlayerId' | 'blackPlayerId'>;

// A pairing meets once a round, so a game keeps its place in the archive when a corrected
// PGN gives it the other colours
const gameKey = ({ section, round, whitePlayerId, blackPlayerId }: GameKey): string =>
  [section, round.trim(), ...[whitePlayerId, blackPlayerId].sort()].join('|');

const sameMoves = (a: string, b: string): boolean =>
  a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

// Only a game left out of its results keeps a reason for it
const uncountedReason = ({ notCounted, notCountedReason }: GameInput): string =>
  notCounted ? notCountedReason.trim() : '';

// A game is told apart from its archived copy by anything the PGN records about it, and by
// where it is filed and whether it counts. Games archived before a game could be left out of
// its results have neither of those fields
function hasChanged(stored: StoredGame, game: GameInput, filing: Filing): boolean {
  return (
    stored.tournament !== filing.tournament ||
    stored.year !== filing.year ||
    stored.section !== game.section ||
    stored.round !== game.round.trim() ||
    (stored.notCounted ?? false) !== game.notCounted ||
    (stored.notCountedReason ?? '') !== uncountedReason(game) ||
    stored.whitePlayerId !== game.whitePlayerId ||
    stored.blackPlayerId !== game.blackPlayerId ||
    stored.result !== game.result ||
    stored.date !== game.date ||
    stored.whiteElo !== game.whiteElo ||
    stored.blackElo !== game.blackElo ||
    stored.eco !== game.eco ||
    stored.plyCount !== game.plyCount ||
    !sameMoves(stored.moves, game.moves)
  );
}

async function storedGames(
  tournament: string,
  year: number,
  games: GameInput[],
): Promise<Map<string, StoredGame>> {
  if (!games.length) {
    return new Map();
  }
  const stored = await GameModel.find(
    {
      tournament,
      year,
      section: { $in: [...new Set(games.map(({ section }) => section))] },
    },
    STORED_GAME_FIELDS,
  ).lean<StoredGame[]>();
  return new Map(stored.map(game => [gameKey(game), game]));
}

// The archived games admins confirmed some of the games to be, by id
async function confirmedGames(games: GameInput[]): Promise<Map<Id, StoredGame>> {
  const ids = games.flatMap(({ archivedGameId }) =>
    archivedGameId ? [new Types.ObjectId(archivedGameId)] : [],
  );
  const stored = ids.length
    ? await GameModel.find({ _id: { $in: ids } }, STORED_GAME_FIELDS).lean<StoredGame[]>()
    : [];
  return new Map(stored.map(game => [game._id.toString(), game]));
}

// The archived copy of each game: the one an admin confirmed it to be, or else the one filed
// where it is, for the same pairing
async function archivedCopies(
  filing: Filing,
  games: GameInput[],
): Promise<(StoredGame | null)[]> {
  const [byKey, byId] = await Promise.all([
    storedGames(filing.tournament, filing.year, games),
    confirmedGames(games),
  ]);
  return games.map(game =>
    game.archivedGameId
      ? (byId.get(game.archivedGameId) ?? null)
      : (byKey.get(gameKey(game)) ?? null),
  );
}

type CandidateGame = Pick<
  GameRecord,
  | '_id'
  | 'tournament'
  | 'year'
  | 'section'
  | 'round'
  | 'date'
  | 'whitePlayerId'
  | 'blackPlayerId'
  | 'result'
  | 'tournamentLink'
>;

const CANDIDATE_GAME_FIELDS = {
  tournament: 1,
  year: 1,
  section: 1,
  round: 1,
  date: 1,
  whitePlayerId: 1,
  blackPlayerId: 1,
  result: 1,
  tournamentLink: 1,
};

// Where a tournament's games are looked for: its archive name, in its year or the next
export interface CandidateFiling {
  number: number;
  tournament: string;
  years: number[];
}

// The games between the same two people, and with a slot, also the games filed in that
// slot with one of them, such as a copy archived under a misspelling of the other
export interface CandidateQuery {
  playerIds: [Id, Id];
  slot?: Pick<GameRecord, 'year' | 'section' | 'round'>;
}

/**
 * The archived games each query's game could be: filed under the tournament's archive name
 * in its year or the next, and accounted for by no other round, neither the archived copy
 * of another game being imported nor a game another tournament's results already link to
 * or an admin tied to one of its rounds. A person's games under their other names count
 * too.
 */
export async function archivedCandidates(
  queries: CandidateQuery[],
  filing: CandidateFiling,
  excludedIds: ReadonlySet<Id>,
): Promise<ArchivedGameSummary[][]> {
  if (!queries.length) {
    return [];
  }
  const people = await personPlayerIds(queries.flatMap(({ playerIds }) => playerIds));
  const sides = queries.map(({ playerIds }) =>
    playerIds.map(id => [...(people.get(id) ?? new Set([id]))]),
  );
  const everyone = [...new Set(sides.flat(2))];
  const [stored, linkedElsewhere] = await Promise.all([
    GameModel.find(
      {
        tournament: filing.tournament,
        year: { $in: filing.years },
        $or: [{ whitePlayerId: { $in: everyone } }, { blackPlayerId: { $in: everyone } }],
      },
      CANDIDATE_GAME_FIELDS,
    )
      .sort({ date: 1, round: 1 })
      .lean<CandidateGame[]>(),
    gamesLinkedElsewhere(filing.tournament, filing.years, filing.number),
  ]);
  const open = stored.filter(
    game =>
      !excludedIds.has(game._id.toString()) &&
      !linkedElsewhere.has(game._id.toString()) &&
      (!game.tournamentLink || game.tournamentLink.number === filing.number),
  );
  const players = await resolvePlayers(
    open.flatMap(game => [game.whitePlayerId, game.blackPlayerId]),
  );
  const player = (id: Id) => players.get(id) ?? { id, ...UNKNOWN_PLAYER };

  return queries.map(({ slot }, index) => {
    const [one, other] = sides[index];
    const slotRound = slot ? roundNumber(slot.round) : null;
    const plays = (side: Id[], game: CandidateGame) =>
      side.includes(game.whitePlayerId) || side.includes(game.blackPlayerId);
    return open
      .filter(
        game =>
          (one.includes(game.whitePlayerId) && other.includes(game.blackPlayerId)) ||
          (other.includes(game.whitePlayerId) && one.includes(game.blackPlayerId)) ||
          (!!slot &&
            slotRound !== null &&
            game.year === slot.year &&
            game.section === slot.section &&
            roundNumber(game.round) === slotRound &&
            (plays(one, game) || plays(other, game))),
      )
      .map(game => ({
        id: game._id.toString(),
        tournament: game.tournament,
        section: game.section,
        round: game.round,
        date: game.date,
        result: game.result,
        white: player(game.whitePlayerId),
        black: player(game.blackPlayerId),
      }));
  });
}

/**
 * How each game compares with the archive: one it lacks, one it holds differently, or the
 * same. Each new game comes with the archived games it might be, filed differently or
 * under another spelling of one of its players.
 */
export async function classifyGames(
  number: number,
  tournament: string,
  year: number,
  games: GameInput[],
): Promise<{ changes: GameChange[]; candidates: ArchivedGameSummary[][] }> {
  const filing = { tournament, year };
  const copies = await archivedCopies(filing, games);
  const changes = games.map((game, index): GameChange => {
    const copy = copies[index];
    return !copy ? 'new' : hasChanged(copy, game, filing) ? 'changed' : 'unchanged';
  });

  const claimed = new Set(copies.flatMap(copy => (copy ? [copy._id.toString()] : [])));
  const newIndexes = changes.flatMap((change, index) =>
    change === 'new' ? [index] : [],
  );
  const found = await archivedCandidates(
    newIndexes.map(index => ({
      playerIds: [games[index].whitePlayerId, games[index].blackPlayerId],
      slot: { year, section: games[index].section, round: games[index].round },
    })),
    { number, tournament, years: [year, year + 1] },
    claimed,
  );
  const candidates = games.map((): ArchivedGameSummary[] => []);
  newIndexes.forEach((gameIndex, at) => (candidates[gameIndex] = found[at]));
  return { changes, candidates };
}

// A section shows the games its own players played under the tournament's name
export function withGameSections(
  sections: TournamentSection[],
  games: GameInput[],
): TournamentSection[] {
  return sections.map(section => {
    const playerIds = new Set(section.entries.map(({ playerId }) => playerId));
    const labels = games
      .filter(
        ({ whitePlayerId, blackPlayerId }) =>
          playerIds.has(whitePlayerId) || playerIds.has(blackPlayerId),
      )
      .map(({ section: label }) => label);
    return {
      ...section,
      gameArchiveSections: [...new Set([...section.gameArchiveSections, ...labels])],
    };
  });
}

// A section also shows the games the archive files under its own name, such as a final's
// games archived before its section joined the tournament
export async function withNamedGameSections(
  sections: TournamentSection[],
  tournament: string,
  year: number,
): Promise<TournamentSection[]> {
  const labels: string[] = await GameModel.distinct('section', { tournament, year });
  return sections.map(section => {
    const name = section.name.trim().toLowerCase();
    const named = labels.filter(label => label.trim().toLowerCase() === name);
    return named.length
      ? {
          ...section,
          gameArchiveSections: [...new Set([...section.gameArchiveSections, ...named])],
        }
      : section;
  });
}

function countGames(counts: Map<Id, number>, ids: Id[], by: number): void {
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + by);
  }
}

/**
 * Brings the archive in line with the games, filing them under the tournament's year: adds
 * the ones it lacks, counting each for both its players, and rewrites the ones it holds
 * differently, a game an admin confirmed to be an archived one taking that one's place.
 * Games it already holds as they are stay untouched. Gives the players games were taken
 * from, such as a misspelling the confirmed game was archived under.
 */
export async function archiveGames(
  tournament: string,
  year: number,
  games: GameInput[],
  modificationInfo: ModificationInfo,
): Promise<Id[]> {
  const filing = { tournament, year };
  const copies = await archivedCopies(filing, games);
  const additions: GameInput[] = [];
  const updates: { stored: StoredGame; game: GameInput }[] = [];
  const seen = new Set<string>();
  games.forEach((game, index) => {
    const copy = copies[index];
    const key = copy ? copy._id.toString() : gameKey(game);
    if (seen.has(key)) return;
    seen.add(key);
    if (!copy) {
      additions.push(game);
    } else if (hasChanged(copy, game, filing)) {
      updates.push({ stored: copy, game });
    }
  });

  if (additions.length) {
    await GameModel.insertMany(
      additions.map(game => ({
        tournament,
        section: game.section,
        location: 'London',
        year,
        date: game.date,
        round: game.round.trim(),
        whitePlayerId: game.whitePlayerId,
        blackPlayerId: game.blackPlayerId,
        result: game.result,
        whiteElo: game.whiteElo,
        blackElo: game.blackElo,
        eco: game.eco,
        opening: openingName(game.moves),
        plyCount: game.plyCount,
        moves: game.moves.trim(),
        annotator: '',
        notCounted: game.notCounted,
        notCountedReason: uncountedReason(game),
        tournamentLink: null,
        modificationInfo,
      })),
    );
  }

  // A game rewritten under other players moves its count from the old players to the new
  const counts = new Map<Id, number>();
  for (const { whitePlayerId, blackPlayerId } of additions) {
    countGames(counts, [whitePlayerId, blackPlayerId], 1);
  }
  for (const { stored, game } of updates) {
    countGames(counts, [stored.whitePlayerId, stored.blackPlayerId], -1);
    countGames(counts, [game.whitePlayerId, game.blackPlayerId], 1);
  }
  const changedCounts = [...counts].filter(([, count]) => count !== 0);
  if (changedCounts.length) {
    await PlayerModel.bulkWrite(
      changedCounts.map(([id, count]) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(id) },
          update: { $inc: { gameCount: count } },
        },
      })),
    );
  }

  if (updates.length) {
    await GameModel.bulkWrite(
      updates.map(({ stored: match, game }) => ({
        updateOne: {
          filter: { _id: match._id },
          update: {
            $set: {
              tournament,
              year,
              section: game.section,
              round: game.round.trim(),
              notCounted: game.notCounted,
              notCountedReason: uncountedReason(game),
              tournamentLink: null,
              whitePlayerId: game.whitePlayerId,
              blackPlayerId: game.blackPlayerId,
              date: game.date,
              result: game.result,
              whiteElo: game.whiteElo,
              blackElo: game.blackElo,
              eco: game.eco,
              opening: openingName(game.moves),
              plyCount: game.plyCount,
              moves: game.moves.trim(),
              modificationInfo: {
                ...match.modificationInfo,
                lastEditedBy: modificationInfo.lastEditedBy,
                lastEditedByNumber: modificationInfo.lastEditedByNumber,
                dateLastEdited: modificationInfo.dateLastEdited,
              },
            },
          },
        },
      })),
    );
  }

  return changedCounts.flatMap(([id, count]) => (count < 0 ? [id] : []));
}
