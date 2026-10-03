import { Schema, Types, model } from 'mongoose';

import { Id, IsoDate } from './core.model';
import { Game, GamePlayer, GameResponse } from './game.model';
import { ModificationInfo } from './modification-info.model';

export type TournamentFormat = 'swiss' | 'round-robin' | 'match' | 'tandem-simul';

export const TOURNAMENT_FORMATS: TournamentFormat[] = [
  'swiss',
  'round-robin',
  'match',
  'tandem-simul',
];

export type RoundOutcome =
  'game' | 'forfeit' | 'full-point-bye' | 'half-point-bye' | 'unplayed';

export const ROUND_OUTCOMES: RoundOutcome[] = [
  'game',
  'forfeit',
  'full-point-bye',
  'half-point-bye',
  'unplayed',
];

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

export interface TournamentRegistration {
  memberId: Id;
  registeredAt: IsoDate;
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
  articleId: Id | null;
  // The archive's name for the tournament, when its games are archived
  gameArchiveTournament: string | null;
  sections: TournamentSection[];
  // Members can register online between these two instants, and never when both are null
  registrationOpens: IsoDate | null;
  registrationCloses: IsoDate | null;
  registrations: TournamentRegistration[];
  // Null on tournaments recorded before the site could edit them
  modificationInfo: ModificationInfo | null;
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
  | 'registrationOpens'
  | 'registrationCloses'
> & {
  sectionCount: number;
  roundCount: number;
  playerCount: number;
  registrationCount: number;
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

export interface TournamentRegistrant {
  memberNumber: number;
  firstName: string;
  lastName: string;
  rating: string;
  registeredAt: IsoDate;
}

export type TournamentResponse = Omit<
  Tournament,
  'id' | 'gameArchiveTournament' | 'sections' | 'registrations'
> & {
  sections: TournamentSectionResponse[];
  registrants: TournamentRegistrant[];
};

// A player as SwissSys names them, "Last, First"
export type EntryInput = Omit<
  TournamentEntry,
  'playerId' | 'performanceRating' | 'resultNote'
> & {
  name: string;
  // The archive player already recorded for the entry, or null to find one by name
  playerId: Id | null;
};

// How a game read from a PGN compares with the tournament's games in the archive
export type GameChange = 'new' | 'changed' | 'unchanged';

// What saving imported results and games would change in a recorded tournament
export interface ImportChanges {
  // Whether each imported section, in order, differs from the recorded one of its name
  sectionChanges: boolean[];
  // The recorded sections the import leaves out, which saving would remove
  removedSections: string[];
  // How each imported game compares with the archive
  games: GameChange[];
}

// A game read from a PGN, to be added to the tournament's games in the archive
export type GameInput = Pick<
  Game,
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
>;

export type SectionInput = Pick<
  TournamentSection,
  'name' | 'ratingBand' | 'roundCount' | 'isDoubleRound'
> & {
  entries: EntryInput[];
};

export type TournamentInput = Pick<
  Tournament,
  | 'name'
  | 'subtitle'
  | 'date'
  | 'endDate'
  | 'format'
  | 'timeControl'
  | 'isRated'
  | 'articleId'
  | 'registrationOpens'
  | 'registrationCloses'
> & {
  // Null keeps the results already recorded
  sections: SectionInput[] | null;
  // Null when no games came with the results
  games: GameInput[] | null;
  modificationInfo: ModificationInfo;
};

export interface PlayerNameMatch {
  name: string;
  // Null when saving the results would add the player to the archive
  playerId: Id | null;
  memberNumber: number | null;
}

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
  // Rounds the member actually played in this section, excluding byes and forfeits
  roundsPlayed: number;
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

const registrationSchema = new Schema<TournamentRegistration>(
  {
    memberId: { type: String, required: true },
    registeredAt: { type: String, required: true },
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
    articleId: { type: String, default: null },
    gameArchiveTournament: { type: String, default: null },
    sections: { type: [sectionSchema], default: [] },
    registrationOpens: { type: String, default: null },
    registrationCloses: { type: String, default: null },
    registrations: { type: [registrationSchema], default: [] },
    modificationInfo: { type: Object, default: null },
  },
  { versionKey: false },
);

tournamentSchema.index({ date: -1 });
tournamentSchema.index({ 'sections.entries.playerId': 1 });

export const TournamentModel = model<Tournament>('Tournament', tournamentSchema);
