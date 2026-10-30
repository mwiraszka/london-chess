import { Schema } from 'mongoose';

import { IsoDate } from './core.model';

export const RATING_PLATFORMS = ['chessCom', 'lichess', 'fide', 'cfc'] as const;
export type RatingPlatform = (typeof RATING_PLATFORMS)[number];

export const TIME_CONTROLS = [
  'standard',
  'regular',
  'rapid',
  'quick',
  'blitz',
  'bullet',
] as const;
export type TimeControl = (typeof TIME_CONTROLS)[number];

export interface ExternalRating {
  timeControl: TimeControl;
  rating: number;
  provisional: boolean;
}

// A place on FIDE's standard rating list: among active players once FIDE counts the
// player as active, and among all players otherwise
export interface FideRank {
  rank: number;
  amongActive: boolean;
}

export interface FideRanks {
  // The player's national federation, such as CAN
  federation: string;
  world: FideRank | null;
  national: FideRank | null;
}

// Null when the platform knows no such player or has not been reached
export interface ExternalRatings {
  chessCom: ExternalRating[] | null;
  lichess: ExternalRating[] | null;
  fide: ExternalRating[] | null;
  cfc: ExternalRating[] | null;
  fideRanks: FideRanks | null;
}

// Kept with the handle it was looked up by, so a changed handle never shows another
// player's ratings
export interface PlatformLookup {
  handle: string;
  ratings: ExternalRating[] | null;
  // Only FIDE ranks its players
  ranks?: FideRanks | null;
}

export interface StoredExternalRatings {
  lookups: Partial<Record<RatingPlatform, PlatformLookup>>;
  checkedAt: IsoDate;
}

const externalRatingSchema = new Schema<ExternalRating>(
  {
    timeControl: { type: String, enum: TIME_CONTROLS, required: true },
    rating: { type: Number, required: true },
    provisional: { type: Boolean, default: false },
  },
  { _id: false },
);

const fideRankSchema = new Schema<FideRank>(
  {
    rank: { type: Number, required: true },
    amongActive: { type: Boolean, required: true },
  },
  { _id: false },
);

const fideRanksSchema = new Schema<FideRanks>(
  {
    federation: { type: String, default: '' },
    world: { type: fideRankSchema, default: null },
    national: { type: fideRankSchema, default: null },
  },
  { _id: false },
);

const platformLookupSchema = new Schema<PlatformLookup>(
  {
    handle: { type: String, required: true },
    ratings: { type: [externalRatingSchema], default: null },
    ranks: { type: fideRanksSchema, default: undefined },
  },
  { _id: false },
);

export const storedExternalRatingsSchema = new Schema<StoredExternalRatings>(
  {
    lookups: {
      chessCom: { type: platformLookupSchema, default: undefined },
      lichess: { type: platformLookupSchema, default: undefined },
      fide: { type: platformLookupSchema, default: undefined },
      cfc: { type: platformLookupSchema, default: undefined },
    },
    checkedAt: { type: String, required: true },
  },
  { _id: false },
);
