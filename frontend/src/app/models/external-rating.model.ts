import { Url } from './core.model';

export type RatingPlatform = 'chessCom' | 'lichess' | 'fide' | 'cfc';

export type TimeControl = 'standard' | 'regular' | 'rapid' | 'quick' | 'blitz' | 'bullet';

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

// Null when the member has no rating in the time control
export interface ChessAccountRating {
  timeControl: TimeControl;
  label: string;
  rating: number | null;
  provisional: boolean;
}

export interface ChessAccountRank extends FideRank {
  label: string;
}

// One of the member's accounts elsewhere, as their profile lists it
export interface ChessAccount {
  platform: RatingPlatform;
  label: string;
  logoSrc: string | null;
  handle: string;
  url: Url;
  // Every time control the platform is shown with, rated or not
  slots: ChessAccountRating[];
  // Whether the platform has been reached and knows the member
  isFound: boolean;
  ranks: ChessAccountRank[];
}
