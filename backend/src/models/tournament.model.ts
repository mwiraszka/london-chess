import { Schema, Types, model } from 'mongoose';

import { Id, Url } from './core.model';
import { GamePlayer, GameResponse } from './game.model';

export type TournamentFormat = 'swiss' | 'round-robin' | 'match' | 'tandem-simul';

export type RoundOutcome =
  'game' | 'forfeit' | 'full-point-bye' | 'half-point-bye' | 'unplayed';

export type PieceColor = 'white' | 'black';

export interface RoundResult {
  round: number;
  outcome: RoundOutcome;
  // One score per game of the round, none for a bye
  scores: number[];
  points: number;
  // Null when not recorded
  opponentRank: number | null;
  color: PieceColor | null;
}

export interface TournamentEntry {
  rank: number;
  playerId: Id;
  // Null when unrated
  rating: number | null;
  // The games a provisional rating rests on
  provisionalGames: number | null;
  performanceRating: number | null;
  score: number | null;
  tiebreak: number | null;
  // Empty when only standings were recorded
  rounds: RoundResult[];
  // A simul board's result, as recorded
  resultNote: string;
}

export interface TournamentSection {
  // Empty for a single section
  name: string;
  ratingBand: string;
  roundCount: number;
  isDoubleRound: boolean;
  // The archive sections holding this section's games
  gameArchiveSections: string[];
  entries: TournamentEntry[];
}

export interface Tournament {
  id: Id;
  // The club's own numbering
  number: number;
  name: string;
  // A theme, the simul givers or the match-up
  subtitle: string;
  // YYYY-MM-DD
  date: string;
  // Null for a tournament played in a day
  endDate: string | null;
  format: TournamentFormat;
  timeControl: string;
  isRated: boolean;
  articleUrl: Url | null;
  // The archive's name for the tournament, when its games are archived
  gameArchiveTournament: string | null;
  sections: TournamentSection[];
}

export type TournamentRecord = Omit<Tournament, 'id'> & { _id: Types.ObjectId };

export type TournamentSummary = Pick<
  Tournament,
  | 'number'
  | 'name'
  | 'subtitle'
  | 'date'
  | 'endDate'
  | 'format'
  | 'timeControl'
  | 'isRated'
> & {
  sectionCount: number;
  roundCount: number;
  playerCount: number;
};

export type TournamentGame = Pick<
  GameResponse,
  'id' | 'section' | 'round' | 'date' | 'white' | 'black' | 'result'
>;

export type RoundResultResponse = RoundResult & {
  // Null when the game was not archived
  gameId: Id | null;
};

export type TournamentEntryResponse = Omit<TournamentEntry, 'playerId' | 'rounds'> & {
  player: GamePlayer;
  rounds: RoundResultResponse[];
};

export type TournamentSectionResponse = Omit<
  TournamentSection,
  'gameArchiveSections' | 'entries'
> & {
  entries: TournamentEntryResponse[];
  games: TournamentGame[];
};

export type TournamentResponse = Omit<
  Tournament,
  'id' | 'gameArchiveTournament' | 'sections'
> & {
  sections: TournamentSectionResponse[];
};

export type MemberTournamentResult = Pick<
  TournamentEntry,
  'rank' | 'rating' | 'provisionalGames' | 'performanceRating' | 'score' | 'resultNote'
> & {
  tournament: Pick<
    Tournament,
    | 'number'
    | 'name'
    | 'subtitle'
    | 'date'
    | 'endDate'
    | 'format'
    | 'timeControl'
    | 'isRated'
  >;
  section: string;
  roundCount: number;
  isDoubleRound: boolean;
  playerCount: number;
};

const roundResultSchema = new Schema<RoundResult>(
  {
    round: { type: Number, required: true },
    outcome: { type: String, required: true },
    scores: { type: [Number], default: [] },
    points: { type: Number, required: true },
    opponentRank: { type: Number, default: null },
    color: { type: String, default: null },
  },
  { _id: false },
);

const entrySchema = new Schema<TournamentEntry>(
  {
    rank: { type: Number, required: true },
    playerId: { type: String, required: true },
    rating: { type: Number, default: null },
    provisionalGames: { type: Number, default: null },
    performanceRating: { type: Number, default: null },
    score: { type: Number, default: null },
    tiebreak: { type: Number, default: null },
    rounds: { type: [roundResultSchema], default: [] },
    resultNote: { type: String, default: '' },
  },
  { _id: false },
);

const sectionSchema = new Schema<TournamentSection>(
  {
    name: { type: String, default: '' },
    ratingBand: { type: String, default: '' },
    roundCount: { type: Number, required: true },
    isDoubleRound: { type: Boolean, default: false },
    gameArchiveSections: { type: [String], default: [] },
    entries: { type: [entrySchema], default: [] },
  },
  { _id: false },
);

const tournamentSchema = new Schema<Tournament>(
  {
    number: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    subtitle: { type: String, default: '' },
    date: { type: String, required: true },
    endDate: { type: String, default: null },
    format: { type: String, required: true },
    timeControl: { type: String, default: '' },
    isRated: { type: Boolean, default: false },
    articleUrl: { type: String, default: null },
    gameArchiveTournament: { type: String, default: null },
    sections: { type: [sectionSchema], default: [] },
  },
  { versionKey: false },
);

tournamentSchema.index({ date: -1 });
tournamentSchema.index({ 'sections.entries.playerId': 1 });

export const TournamentModel = model<Tournament>('Tournament', tournamentSchema);
