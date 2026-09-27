import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

import { ArticleModel } from '../src/models/article.model';
import { CounterModel, MEMBER_NUMBER_COUNTER_ID } from '../src/models/counter.model';
import { EventModel } from '../src/models/event.model';
import { GameModel } from '../src/models/game.model';
import { ImageModel } from '../src/models/image.model';
import { MemberModel } from '../src/models/member.model';
import { ModificationInfo } from '../src/models/modification-info.model';
import { PlayerModel } from '../src/models/player.model';
import { TournamentModel, TournamentSection } from '../src/models/tournament.model';
import { memberAccount } from '../src/testing/fixtures';
import { putObject } from './fake-storage';
import {
  ADMIN,
  ARCHIVE_ONLY_GAMES,
  ARTICLES,
  CHAMPION_MEMBER_DETAILS,
  EVENTS,
  IMAGES,
  MOVES,
  OTHER_MEMBERS,
  PLAYERS,
  PROFILE_MEMBER,
  RIVAL_MEMBER,
  SeedGame,
  SeedMember,
  SeedTournament,
  TOURNAMENTS,
  pairSection,
  standings,
} from './seed-data';

export const IMAGES_BUCKET = 'images';

const DAY_MS = 24 * 3600 * 1000;

// The app names the reigning champion in its source, so the seed follows whatever it says
function cityChampionName(): { firstName: string; lastName: string } {
  const source = readFileSync(
    resolve(__dirname, '../../frontend/src/app/utils/chess/is-city-champion.util.ts'),
    'utf8',
  );
  const firstName = source.match(/firstName: '([^']+)'/)?.[1];
  const lastName = source.match(/lastName: '([^']+)'/)?.[1];
  if (!firstName || !lastName) {
    throw new Error('Unable to read the city champion from the frontend.');
  }
  return { firstName, lastName };
}

function modificationInfo(date: Date): ModificationInfo {
  const iso = date.toISOString();
  return {
    dateCreated: iso,
    createdBy: `${ADMIN.firstName} ${ADMIN.lastName}`,
    createdByNumber: ADMIN.number ?? null,
    dateLastEdited: iso,
    lastEditedBy: `${ADMIN.firstName} ${ADMIN.lastName}`,
    lastEditedByNumber: ADMIN.number ?? null,
  };
}

// An evening in London, Ontario, on the day the given number of days away
function clubEvening(daysFromNow: number): Date {
  const date = new Date(Date.now() + daysFromNow * DAY_MS);
  date.setUTCHours(22, 0, 0, 0);
  return date;
}

async function seedMembers(
  adminClerkUserId: string | null,
): Promise<Map<string, string>> {
  const champion: SeedMember = { ...CHAMPION_MEMBER_DETAILS, ...cityChampionName() };
  const members = [ADMIN, champion, PROFILE_MEMBER, RIVAL_MEMBER, ...OTHER_MEMBERS];
  const created = new Date('2024-01-15T15:00:00.000Z');

  const records = await MemberModel.insertMany(
    members.map(member => {
      const isAdmin = member.key === ADMIN.key;
      const clerkUserId = isAdmin ? adminClerkUserId : `user_e2e_${member.key}`;
      const account =
        member.number !== undefined && clerkUserId
          ? memberAccount({ clerkUserId, isAdmin })
          : null;
      return {
        number: account ? member.number : undefined,
        firstName: member.firstName,
        lastName: member.lastName,
        rating: member.rating,
        peakRating: member.peakRating,
        email: `${member.key}@example.com`,
        phoneNumber: '',
        city: member.city,
        yearOfBirth: member.yearOfBirth ?? '',
        chessComUsername: member.chessComUsername ?? '',
        lichessUsername: member.lichessUsername ?? '',
        isActive: member.isActive,
        dateJoined: member.dateJoined ?? '2022-09-01T22:00:00.000Z',
        modificationInfo: modificationInfo(created),
        account,
        preferences: { showYearOfBirth: member.showYearOfBirth ?? false },
      };
    }),
  );

  // New accounts take numbers after the seeded ones
  await CounterModel.create({ _id: MEMBER_NUMBER_COUNTER_ID, next: 100 });

  return new Map(members.map((member, index) => [member.key, records[index].id]));
}

async function seedPlayers(memberIds: Map<string, string>): Promise<Map<string, string>> {
  const champion = cityChampionName();
  const records = await PlayerModel.insertMany(
    PLAYERS.map(player => ({
      ...(player.key === 'champion' ? champion : player),
      suffix: '',
      memberId: player.memberKey ? (memberIds.get(player.memberKey) ?? null) : null,
    })),
  );
  return new Map(PLAYERS.map((player, index) => [player.key, records[index].id]));
}

function tournamentGames(tournament: SeedTournament): SeedGame[] {
  if (!tournament.gameArchiveTournament) {
    return [];
  }
  const start = new Date(`${tournament.date}T00:00:00.000Z`).getTime();
  return tournament.sections.flatMap(section =>
    pairSection(section, tournament.isDoubleRound).map(pairing => {
      const [score] = pairing.whiteScores;
      return {
        tournament: tournament.gameArchiveTournament!,
        section: section.gameArchiveSection ?? '',
        year: Number(tournament.date.slice(0, 4)),
        date: new Date(start + (pairing.round - 1) * 7 * DAY_MS)
          .toISOString()
          .slice(0, 10),
        round: String(pairing.round),
        whiteKey: pairing.whiteKey,
        blackKey: pairing.blackKey,
        result: score === 1 ? '1-0' : score === 0 ? '0-1' : '1/2-1/2',
      };
    }),
  );
}

async function seedGames(playerIds: Map<string, string>): Promise<void> {
  const games = [...TOURNAMENTS.flatMap(tournamentGames), ...ARCHIVE_ONLY_GAMES];
  await GameModel.insertMany(
    games.map((game, index) => {
      const [eco, opening, moves, plyCount] = MOVES[index % MOVES.length];
      return {
        tournament: game.tournament,
        section: game.section,
        location: 'London',
        year: game.year,
        date: game.date,
        round: game.round,
        whitePlayerId: playerIds.get(game.whiteKey),
        blackPlayerId: playerIds.get(game.blackKey),
        result: game.result,
        whiteElo: 1500 + ((index * 37) % 500),
        blackElo: index % 5 ? 1500 + ((index * 53) % 500) : null,
        eco,
        opening,
        plyCount,
        moves: `${moves} ${game.result}`,
        annotator: '',
        modificationInfo: modificationInfo(new Date('2025-12-01T12:00:00.000Z')),
      };
    }),
  );

  for (const [key, id] of playerIds) {
    const gameCount = games.filter(
      game => game.whiteKey === key || game.blackKey === key,
    ).length;
    await PlayerModel.updateOne({ _id: id }, { $set: { gameCount } });
  }
}

async function seedTournaments(playerIds: Map<string, string>): Promise<void> {
  await TournamentModel.insertMany(
    TOURNAMENTS.map(tournament => ({
      number: tournament.number,
      name: tournament.name,
      subtitle: tournament.subtitle,
      date: tournament.date,
      endDate: tournament.endDate,
      format: tournament.format,
      timeControl: tournament.timeControl,
      isRated: tournament.isRated,
      articleUrl: null,
      gameArchiveTournament: tournament.gameArchiveTournament,
      sections: tournament.sections.map((section): TournamentSection => {
        const rows = standings(section, tournament.isDoubleRound);
        const rankOf = (key: string) => rows.find(row => row.playerKey === key)!.rank;
        return {
          name: section.name,
          ratingBand: section.ratingBand,
          roundCount: section.roundCount,
          isDoubleRound: tournament.isDoubleRound ?? false,
          gameArchiveSections:
            section.gameArchiveSection === undefined ? [] : [section.gameArchiveSection],
          entries: rows.map(row => ({
            rank: row.rank,
            playerId: playerIds.get(row.playerKey)!,
            rating: 1400 + (section.playerKeys.length - row.rank) * 90,
            provisionalGames: null,
            performanceRating: tournament.isRated ? 1500 + row.score * 100 : null,
            score: row.score,
            tiebreak: null,
            resultNote: '',
            rounds: row.rounds.map(round => ({
              round: round.round,
              outcome: 'game',
              scores: round.scores,
              points: round.scores.reduce((sum, value) => sum + value, 0),
              opponentRank: rankOf(round.opponentKey),
              color: round.color,
            })),
          })),
        };
      }),
    })),
  );
}

async function pictureOf(hue: number, width: number, height: number): Promise<Buffer> {
  const background = `hsl(${hue}, 55%, 55%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${background}" />
    <circle cx="${width / 2}" cy="${height / 2}" r="${height / 3}" fill="hsl(${(hue + 180) % 360}, 45%, 40%)" />
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 70 }).toBuffer();
}

async function seedImages(): Promise<void> {
  await ImageModel.insertMany(
    await Promise.all(
      IMAGES.map(async (image, index) => {
        const [main, thumbnail] = await Promise.all([
          pictureOf(image.hue, 1200, 800),
          pictureOf(image.hue, 320, 213),
        ]);
        putObject(IMAGES_BUCKET, image.id, main, 'image/jpeg');
        putObject(IMAGES_BUCKET, `${image.id}-thumb`, thumbnail, 'image/jpeg');
        return {
          _id: image.id,
          filename: image.filename,
          mainFileSize: main.length,
          mainWidth: 1200,
          mainHeight: 800,
          thumbnailFileSize: thumbnail.length,
          thumbnailWidth: 320,
          thumbnailHeight: 213,
          caption: image.caption,
          album: image.album,
          albumCover: image.albumCover,
          albumOrdinality: image.albumOrdinality,
          modificationInfo: modificationInfo(
            new Date(Date.parse('2025-06-01T12:00:00.000Z') + index * DAY_MS),
          ),
        };
      }),
    ),
  );
}

async function seedArticlesAndEvents(): Promise<void> {
  await ArticleModel.insertMany(
    ARTICLES.map(article => {
      const date = new Date(Date.now() - article.daysAgo * DAY_MS);
      return {
        _id: article.id,
        title: article.title,
        body: article.body,
        bannerImageId: article.bannerImageId,
        bookmarkDate: article.isBookmarked ? date.toISOString() : null,
        modificationInfo: modificationInfo(date),
      };
    }),
  );

  await EventModel.insertMany(
    EVENTS.map(event => ({
      _id: event.id,
      eventDate: clubEvening(event.daysFromNow).toISOString(),
      title: event.title,
      details: event.details,
      type: event.type,
      articleId: event.articleId ?? '',
      modificationInfo: modificationInfo(
        clubEvening(Math.min(event.daysFromNow, 0) - 14),
      ),
    })),
  );
}

export async function seed(adminClerkUserId: string | null): Promise<void> {
  const memberIds = await seedMembers(adminClerkUserId);
  const playerIds = await seedPlayers(memberIds);
  await Promise.all([
    seedGames(playerIds),
    seedTournaments(playerIds),
    seedImages(),
    seedArticlesAndEvents(),
  ]);
}
