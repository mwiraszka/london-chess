import * as Sentry from '@sentry/node';

import {
  ExternalRating,
  ExternalRatings,
  FideRank,
  PlatformLookup,
  RATING_PLATFORMS,
  RatingPlatform,
  TimeControl,
} from '../models/external-rating.model';
import { MemberModel, MemberRecord } from '../models/member.model';

// Online ratings move a few times a day at most, and federation ratings far less often
const MAX_AGE_MS = 6 * 3600 * 1000;
const LOOKUP_TIMEOUT_MS = 5000;
// Chess.com turns away requests that do not say who is asking
const USER_AGENT = 'London Chess Club (https://londonchess.ca)';

type HandleField = 'chessComUsername' | 'lichessUsername' | 'fideId' | 'cfcId';

const HANDLE_FIELDS: Record<RatingPlatform, HandleField> = {
  chessCom: 'chessComUsername',
  lichess: 'lichessUsername',
  fide: 'fideId',
  cfc: 'cfcId',
};

const CHESS_COM_TIME_CONTROLS: [string, TimeControl][] = [
  ['chess_rapid', 'rapid'],
  ['chess_blitz', 'blitz'],
  ['chess_bullet', 'bullet'],
];

const LICHESS_TIME_CONTROLS: TimeControl[] = ['rapid', 'blitz', 'bullet'];

// Each keyed by the class of its box on a FIDE profile page
const FIDE_TIME_CONTROLS: [string, TimeControl][] = [
  ['profile-standart', 'standard'],
  ['profile-rapid', 'rapid'],
  ['profile-blitz', 'blitz'],
];

const CFC_TIME_CONTROLS: [string, TimeControl][] = [
  ['regular_rating', 'regular'],
  ['quick_rating', 'quick'],
];

type LookupResult = Pick<PlatformLookup, 'ratings' | 'worldRank'>;

type Lookup = (handle: string) => Promise<LookupResult>;

const LOOKUPS: Record<RatingPlatform, Lookup> = {
  chessCom: lookUpChessCom,
  lichess: lookUpLichess,
  fide: lookUpFide,
  cfc: lookUpCfc,
};

// The stored ratings of the member's current handles
export function externalRatingsOf(record: MemberRecord): ExternalRatings {
  return {
    chessCom: currentLookup(record, 'chessCom')?.ratings ?? null,
    lichess: currentLookup(record, 'lichess')?.ratings ?? null,
    fide: currentLookup(record, 'fide')?.ratings ?? null,
    cfc: currentLookup(record, 'cfc')?.ratings ?? null,
    fideWorldRank: currentLookup(record, 'fide')?.worldRank ?? null,
  };
}

// Milliseconds until the stored ratings need looking up again: none once a handle has
// changed, and forever for a member with no handles
export function externalRatingsFreshFor(record: MemberRecord, now = Date.now()): number {
  const platforms = RATING_PLATFORMS.filter(platform => handleOf(record, platform));
  if (!platforms.length) {
    return Infinity;
  }

  const stored = record.externalRatings;
  if (
    !stored ||
    platforms.some(
      platform => stored.lookups[platform]?.handle !== handleOf(record, platform),
    )
  ) {
    return 0;
  }
  return Math.max(0, Date.parse(stored.checkedAt) + MAX_AGE_MS - now);
}

// Whether any of the member's handles has yet to be looked up, as one just given has
export function hasUnlookedHandles(record: MemberRecord): boolean {
  return RATING_PLATFORMS.some(
    platform =>
      handleOf(record, platform) &&
      record.externalRatings?.lookups[platform]?.handle !== handleOf(record, platform),
  );
}

// The record with the ratings it saved, or as it was when they could not be saved. Never
// rejects, so it can run on after the response that started it
export async function refreshExternalRatings(
  record: MemberRecord,
): Promise<MemberRecord> {
  try {
    const lookups: Partial<Record<RatingPlatform, PlatformLookup>> = {};
    await Promise.all(
      RATING_PLATFORMS.map(async platform => {
        const handle = handleOf(record, platform);
        if (handle) {
          lookups[platform] = { ...(await lookUp(record, platform, handle)), handle };
        }
      }),
    );

    const externalRatings = { lookups, checkedAt: new Date().toISOString() };
    await MemberModel.updateOne({ _id: record._id }, { $set: { externalRatings } });
    return { ...record, externalRatings };
  } catch (error) {
    report(`Unable to save the external ratings of member ${record._id}`, error);
    return record;
  }
}

function handleOf(record: MemberRecord, platform: RatingPlatform): string {
  return record[HANDLE_FIELDS[platform]] ?? '';
}

function currentLookup(
  record: MemberRecord,
  platform: RatingPlatform,
): PlatformLookup | null {
  const handle = handleOf(record, platform);
  const lookup = record.externalRatings?.lookups[platform];
  return handle && lookup?.handle === handle ? lookup : null;
}

// A site that cannot be reached leaves what it last gave for the same handle
async function lookUp(
  record: MemberRecord,
  platform: RatingPlatform,
  handle: string,
): Promise<LookupResult> {
  try {
    return await LOOKUPS[platform](handle);
  } catch (error) {
    report(`Unable to look up the ${platform} ratings of ${handle}`, error);
    return currentLookup(record, platform) ?? { ratings: null };
  }
}

async function lookUpChessCom(username: string): Promise<LookupResult> {
  const stats = await fetchJson(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`,
  );
  if (!isRecord(stats)) {
    return { ratings: null };
  }
  return {
    ratings: CHESS_COM_TIME_CONTROLS.flatMap(([key, timeControl]) =>
      rated(timeControl, field(field(stats[key], 'last'), 'rating')),
    ),
  };
}

async function lookUpLichess(username: string): Promise<LookupResult> {
  const user = await fetchJson(
    `https://lichess.org/api/user/${encodeURIComponent(username)}`,
  );
  if (!isRecord(user) || user['disabled'] === true) {
    return { ratings: null };
  }
  // Lichess gives every player a starting rating in each time control, played or not
  return {
    ratings: LICHESS_TIME_CONTROLS.flatMap(timeControl => {
      const perf = field(user['perfs'], timeControl);
      const games = field(perf, 'games');
      return typeof games === 'number' && games > 0
        ? rated(timeControl, field(perf, 'rating'), field(perf, 'prov') === true)
        : [];
    }),
  };
}

// FIDE has no API, so this reads the player's profile page, the only place it gives
// their world rank
async function lookUpFide(id: string): Promise<LookupResult> {
  const page = await fetchText(
    `https://ratings.fide.com/profile/${encodeURIComponent(id)}`,
    'text/html',
  );
  // An unknown ID still answers, with a page that has no ratings on it
  if (!page?.includes('profile-games')) {
    return { ratings: null };
  }
  return {
    ratings: FIDE_TIME_CONTROLS.flatMap(([className, timeControl]) =>
      rated(timeControl, fideRating(page, className)),
    ),
    worldRank: fideWorldRank(page),
  };
}

// A time control the player is not rated in reads as Not rated, so as no number at all
function fideRating(page: string, className: string): number {
  const box = new RegExp(
    `class="${className} profile-game[^"]*">[\\s\\S]*?<p>([^<]*)</p>`,
  );
  return Number(page.match(box)?.[1]);
}

// Absent for a player without a standard rating. FIDE ranks an inactive player as zero
// among active players
function fideWorldRank(page: string): FideRank | null {
  const block =
    page.match(/<h5>World Rank<\/h5>([\s\S]*?)<!--profile-rank-->/)?.[1] ?? '';
  const active = Number(block.match(/Active players<\/h6>\s*<p>(\d+)/)?.[1]);
  const all = Number(block.match(/All players<\/h6>\s*<p>(\d+)/)?.[1]);
  if (active > 0) {
    return { rank: active, amongActive: true };
  }
  return all > 0 ? { rank: all, amongActive: false } : null;
}

async function lookUpCfc(id: string): Promise<LookupResult> {
  const answer = await fetchJson(
    `https://server.chess.ca/api/player/v1/${encodeURIComponent(id)}`,
  );
  const player = field(answer, 'player');
  // An unknown ID still answers, with a player who has no name
  if (typeof field(player, 'name_last') !== 'string') {
    return { ratings: null };
  }
  return {
    ratings: CFC_TIME_CONTROLS.flatMap(([key, timeControl]) =>
      rated(timeControl, field(player, key)),
    ),
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const body = await fetchText(url, 'application/json');
  return body?.trim() ? JSON.parse(body) : null;
}

// Null for a player the site does not know
async function fetchText(url: string, accept: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: { Accept: accept, 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  return response.text();
}

// Sites record an unrated time control as zero, as well as leaving it out
function rated(
  timeControl: TimeControl,
  rating: unknown,
  provisional = false,
): ExternalRating[] {
  return typeof rating === 'number' && rating > 0
    ? [{ timeControl, rating, provisional }]
    : [];
}

function field(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function report(message: string, error: unknown): void {
  console.error(`[LCC] ${message}: ${error}`);
  Sentry.captureException(error);
}
