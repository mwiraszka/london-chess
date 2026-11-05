import { Types } from 'mongoose';

import { Id } from '../models/core.model';
import { GameModel, GamePlayer, TournamentLink } from '../models/game.model';
import {
  ArchiveGamesReview,
  ArchiveGamesUpdate,
  TournamentRecord,
  UnlinkedPairing,
} from '../models/tournament.model';
import { UNKNOWN_PLAYER, resolvePlayers } from './games.service';
import { archivedGamesBetween } from './tournament-games.service';
import {
  gamesOfSection,
  matchRoundGames,
  roundKey,
  standInRanksOf,
  tournamentGames,
} from './tournaments.service';

type ReviewedRecord = Pick<
  TournamentRecord,
  'number' | 'date' | 'gameArchiveTournament' | 'sections'
>;

interface Pairing {
  section: string;
  round: number;
  playerIds: [Id, Id];
  ranks: [number, number];
}

const year = ({ date }: Pick<TournamentRecord, 'date'>): number =>
  Number(date.slice(0, 4));

async function playersOf(
  record: ReviewedRecord,
  gamePlayerIds: Id[] = [],
): Promise<(id: Id) => GamePlayer> {
  const players = await resolvePlayers([
    ...record.sections.flatMap(({ entries }) => entries.map(({ playerId }) => playerId)),
    ...gamePlayerIds,
  ]);
  return id => players.get(id) ?? { id, ...UNKNOWN_PLAYER };
}

// The rounds the standings record two of a section's own players meeting in, each once
function pairingsOf(record: ReviewedRecord, player: (id: Id) => GamePlayer): Pairing[] {
  return record.sections.flatMap(section => {
    const byRank = new Map(section.entries.map(entry => [entry.rank, entry]));
    const standIns = standInRanksOf(record.sections, section.entries, player);
    return section.entries.flatMap(entry =>
      entry.rounds.flatMap(({ round, outcome, opponentRank }) => {
        const opponent = opponentRank === null ? undefined : byRank.get(opponentRank);
        return outcome === 'game' &&
          opponent &&
          entry.rank < opponent.rank &&
          !standIns.has(entry.rank) &&
          !standIns.has(opponent.rank)
          ? [
              {
                section: section.name,
                round,
                playerIds: [entry.playerId, opponent.playerId] as [Id, Id],
                ranks: [entry.rank, opponent.rank] as [number, number],
              },
            ]
          : [];
      }),
    );
  });
}

/**
 * How the tournament's results and its games in the archive line up: each pairing the
 * standings record with no archived game tied to it, with the games it might be, and each
 * game filed under the tournament that no round is tied to.
 */
export async function reviewArchiveGames(
  record: ReviewedRecord,
): Promise<ArchiveGamesReview> {
  const games = await tournamentGames(record);
  const player = await playersOf(
    record,
    games.flatMap(game => [game.whitePlayerId, game.blackPlayerId]),
  );
  const pairings = pairingsOf(record, player);

  const linked = new Set<Id>();
  const unlinked: Pick<Pairing, 'section' | 'round' | 'playerIds'>[] = [];
  for (const section of record.sections) {
    const gameIds = matchRoundGames(
      section.entries,
      gamesOfSection(record, section, games),
      standInRanksOf(record.sections, section.entries, player),
    );
    gameIds.forEach(id => linked.add(id));
    unlinked.push(
      ...pairings
        .filter(
          ({ section: name, ranks, round }) =>
            name === section.name &&
            ranks.every(rank => !gameIds.has(roundKey(rank, round))),
        )
        .map(({ section: name, round, playerIds }) => ({
          section: name,
          round,
          playerIds,
        })),
    );
  }

  const candidates = await archivedGamesBetween(
    unlinked.map(({ playerIds }) => playerIds),
    [year(record), year(record) + 1],
    linked,
  );
  const unlinkedPairings: UnlinkedPairing[] = unlinked.map((pairing, index) => ({
    section: pairing.section,
    round: pairing.round,
    players: pairing.playerIds.map(player),
    candidates: candidates[index],
  }));

  return {
    unlinked: unlinkedPairings,
    unplaced: games
      .filter(game => !linked.has(game._id.toString()))
      .map(game => ({
        id: game._id.toString(),
        tournament: game.tournament,
        section: game.section,
        round: game.round,
        date: game.date,
        result: game.result,
        white: player(game.whitePlayerId),
        black: player(game.blackPlayerId),
        // Games archived before a game could be left out of its results have neither field
        notCounted: game.notCounted ?? false,
        notCountedReason: game.notCountedReason ?? '',
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.round.localeCompare(b.round)),
  };
}

/**
 * The first reason the update cannot be saved: a link must tie a game to a pairing the
 * standings record, and a game's count can only change for a game of the tournament.
 */
export async function archiveUpdateProblem(
  record: ReviewedRecord,
  update: ArchiveGamesUpdate,
): Promise<string | null> {
  const pairings = pairingsOf(record, await playersOf(record));
  for (const link of update.links) {
    const recorded = pairings.some(
      ({ section, round, playerIds }) =>
        section === link.section &&
        round === link.round &&
        link.playerIds.length === 2 &&
        link.playerIds.every(id => playerIds.includes(id)),
    );
    if (!recorded) {
      return `the standings record no such pairing in section ${link.section || '(unnamed)'}, round ${link.round}`;
    }
  }

  const ids = [...update.links, ...update.counts].map(({ gameId }) => gameId);
  const found = await GameModel.countDocuments({
    _id: { $in: [...new Set(ids)].map(id => new Types.ObjectId(id)) },
  });
  if (found !== new Set(ids).size) {
    return 'a game it names is not in the archive';
  }

  const ownIds = new Set(
    (await tournamentGames(record)).map(({ _id }) => _id.toString()),
  );
  const foreign = update.counts.find(({ gameId }) => !ownIds.has(gameId));
  return foreign ? 'a game whose count it changes is not one of the tournament' : null;
}

export async function applyArchiveUpdate(
  record: ReviewedRecord,
  { links, counts }: ArchiveGamesUpdate,
): Promise<void> {
  const operations = [
    ...links.map(({ gameId, section, round, playerIds }) => {
      const tournamentLink: TournamentLink = {
        number: record.number,
        section,
        round,
        playerIds,
      };
      return {
        updateOne: {
          filter: { _id: new Types.ObjectId(gameId) },
          update: { $set: { tournamentLink } },
        },
      };
    }),
    ...counts.map(({ gameId, notCounted, notCountedReason }) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(gameId) },
        update: {
          $set: {
            notCounted,
            notCountedReason: notCounted ? notCountedReason.trim() : '',
          },
        },
      },
    })),
  ];
  if (operations.length) {
    await GameModel.bulkWrite(operations);
  }
}
