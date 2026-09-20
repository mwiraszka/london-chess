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
  // Each game's score for this player: two in a round of two games, none without a game
  scores: number[];
  points: number;
  // The opponent's rank in the section, when it was recorded
  opponentRank: number | null;
  color: PieceColor | null;
}

export interface TournamentEntry {
  rank: number;
  playerId: Id;
  // The rating the player brought to the tournament, or null when unrated
  rating: number | null;
  // Set when the rating was provisional, to the number of games it rested on
  provisionalGames: number | null;
  performanceRating: number | null;
  score: number | null;
  tiebreak: number | null;
  // Empty when only the standings were recorded
  rounds: RoundResult[];
  // A simul board's result, in the words it was recorded in
  resultNote: string;
}

export interface TournamentSection {
  // Empty for a tournament with a single section
  name: string;
  ratingBand: string;
  roundCount: number;
  // Every pairing plays two games, one with each color
  isDoubleRound: boolean;
  // The game archive sections that hold this section's games
  gameArchiveSections: string[];
  entries: TournamentEntry[];
}

export interface Tournament {
  id: Id;
  // The club's own numbering, in the order the tournaments were played
  number: number;
  name: string;
  // An opening theme, the simul givers or the match-up
  subtitle: string;
  // YYYY-MM-DD
  date: string;
  // The last day of a tournament played over several, or null for one played in a day
  endDate: string | null;
  format: TournamentFormat;
  timeControl: string;
  isRated: boolean;
  articleUrl: Url | null;
  // The game archive's name for this tournament, when its games are in the archive
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
  // The game in the archive, when it was recorded
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

// A tournament as sent to clients, with its players resolved and its games attached
export type TournamentResponse = Omit<
  Tournament,
  'id' | 'gameArchiveTournament' | 'sections'
> & {
  sections: TournamentSectionResponse[];
};

// One member's showing in one tournament
export type MemberTournamentResult = Pick<
  TournamentEntry,
  'rank' | 'rating' | 'provisionalGames' | 'performanceRating' | 'score' | 'resultNote'
> & {
  tournament: Pick<
    Tournament,
    'number' | 'name' | 'subtitle' | 'date' | 'endDate' | 'format' | 'isRated'
  >;
  section: string;
  roundCount: number;
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
