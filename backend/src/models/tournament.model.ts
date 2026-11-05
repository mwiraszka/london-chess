import { Schema, Types, model } from 'mongoose';

import { Id, IsoDate } from './core.model';
import { Game, GamePlayer, GameResponse } from './game.model';
import { ModificationInfo } from './modification-info.model';

type TournamentFormat = 'swiss' | 'round-robin' | 'match' | 'tandem-simul';

export const TOURNAMENT_FORMATS: TournamentFormat[] = [
  'swiss',
  'round-robin',
  'match',
  'tandem-simul',
];

type RoundOutcome = 'game' | 'forfeit' | 'full-point-bye' | 'half-point-bye' | 'unplayed';

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
  // The rounds it is set to run, or null while undecided; its results record their own
  roundCount: number | null;
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
  | 'roundCount'
  | 'isRated'
  | 'articleId'
  | 'registrationOpens'
  | 'registrationCloses'
> & {
  sections: TournamentSectionSummary[];
  playerCount: number;
  registrants: TournamentRegistrant[];
};

// Enough of a section to lay out its tables before they load
export type TournamentSectionSummary = Pick<
  TournamentSection,
  'name' | 'ratingBand' | 'roundCount'
> & {
  entryCount: number;
  // Whether rounds were recorded, or only the standings
  hasRounds: boolean;
  gameCount: number;
};

export type TournamentGame = Pick<
  GameResponse,
  'id' | 'section' | 'round' | 'date' | 'white' | 'black' | 'result'
>;

type RoundResultResponse = RoundResult & {
  // Null when the game was not archived
  gameId: Id | null;
};

type TournamentEntryResponse = Omit<TournamentEntry, 'playerId' | 'rounds'> & {
  player: GamePlayer;
  rounds: RoundResultResponse[];
};

type TournamentSectionResponse = Omit<
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
  // Games played in the tournament but left out of its results
  uncountedGames: UncountedGame[];
};

export type UncountedGame = TournamentGame & Pick<Game, 'notCountedReason'>;

// A pairing the standings record as played that no archived game is tied to yet
export interface UnlinkedPairing {
  section: string;
  round: number;
  players: GamePlayer[];
  candidates: ArchivedGameSummary[];
}

// A game filed under the tournament that no round of its results is tied to
export type UnplacedGame = ArchivedGameSummary &
  Pick<Game, 'notCounted' | 'notCountedReason'>;

// How a tournament's results and the archive's games of it line up, for an admin to settle
export interface ArchiveGamesReview {
  unlinked: UnlinkedPairing[];
  unplaced: UnplacedGame[];
}

// Ties an archived game to a round of a section, between the two standings players
export interface ArchiveGameLink {
  gameId: Id;
  section: string;
  round: number;
  playerIds: Id[];
}

export interface ArchiveGameCount {
  gameId: Id;
  notCounted: boolean;
  notCountedReason: string;
}

export interface ArchiveGamesUpdate {
  links: ArchiveGameLink[];
  counts: ArchiveGameCount[];
}

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
  // For each new game, the archived games between the same two people around the
  // tournament's year, any of which may be the same game filed differently
  candidates: ArchivedGameSummary[][];
}

// An archived game as a list of games to choose from shows it
export type ArchivedGameSummary = TournamentGame & {
  // The archive's name for the event
  tournament: string;
};

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
  | 'notCounted'
  | 'notCountedReason'
> & {
  // The archived game an admin confirmed this one to be, which takes its details; null to
  // find it by its filing
  archivedGameId: Id | null;
};

export type SectionInput = Pick<
  TournamentSection,
  'name' | 'ratingBand' | 'roundCount' | 'isDoubleRound'
> & {
  entries: EntryInput[];
};

export type TournamentDetails = Pick<
  Tournament,
  | 'name'
  | 'subtitle'
  | 'date'
  | 'endDate'
  | 'format'
  | 'timeControl'
  | 'roundCount'
  | 'isRated'
  | 'articleId'
  | 'registrationOpens'
  | 'registrationCloses'
>;

export type TournamentInput = TournamentDetails & {
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
  // The member the name belongs to, with or without an account
  memberId: Id | null;
  // Every archive player recorded for the same person: the member's other names too
  personPlayerIds: Id[];
}

// A game between two members, as the first of them played it
export interface HeadToHeadGame {
  // Null for a game outside every recorded tournament
  tournamentNumber: number | null;
  // The recorded tournament's name, or else the archive's
  tournament: string;
  section: string;
  // As much of the date as was recorded: YYYY, YYYY-MM or YYYY-MM-DD
  date: string;
  round: string;
  // Null when not recorded
  color: PieceColor | null;
  // The first member's score: 1, 0.5 or 0
  score: number;
  // Null when the game was not archived
  gameId: Id | null;
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
    roundCount: { type: Number, default: null },
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
