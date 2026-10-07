import { DataTableColumn } from '@eagami/ui';

import { FormControl } from '@angular/forms';

import { Id, IsoDate } from './core.model';
import { Game, GamePlayer } from './game.model';
import { ModificationInfo } from './modification-info.model';

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
  // Null when the game was not archived
  gameId: Id | null;
}

export interface TournamentEntry {
  rank: number;
  player: GamePlayer;
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

export type TournamentGame = Pick<
  Game,
  'id' | 'section' | 'round' | 'date' | 'white' | 'black' | 'result'
>;

export interface TournamentSection {
  // Empty for a single section
  name: string;
  ratingBand: string;
  roundCount: number;
  isDoubleRound: boolean;
  entries: TournamentEntry[];
  games: TournamentGame[];
}

// A member who registered online for an upcoming tournament
export interface TournamentRegistrant {
  memberNumber: number;
  firstName: string;
  lastName: string;
  rating: string;
  registeredAt: IsoDate;
}

export interface Tournament {
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
  sections: TournamentSection[];
  // Members can register online between these two instants, and never when both are null
  registrationOpens: IsoDate | null;
  registrationCloses: IsoDate | null;
  registrants: TournamentRegistrant[];
  // Null on tournaments recorded before the site could edit them
  modificationInfo: ModificationInfo | null;
}

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

export type RoundResultInput = Omit<RoundResult, 'gameId'>;

// A standing as SwissSys exports it, the player named "Last, First"
export interface EntryInput {
  rank: number;
  name: string;
  // The archive player already recorded for the entry, or null to find one by name
  playerId: Id | null;
  rating: number | null;
  provisionalGames: number | null;
  score: number | null;
  tiebreak: number | null;
  rounds: RoundResultInput[];
}

export interface SectionInput {
  // Empty for a single section
  name: string;
  ratingBand: string;
  roundCount: number;
  isDoubleRound: boolean;
  entries: EntryInput[];
}

export type TournamentDetails = Pick<
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
>;

// How a game read from a PGN compares with the tournament's games in the archive
export type GameChange = 'new' | 'changed' | 'unchanged';

// What saving imported results and games would change, as the server works it out
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
  | 'result'
  | 'whiteElo'
  | 'blackElo'
  | 'eco'
  | 'plyCount'
  | 'moves'
> & {
  whitePlayerId: Id;
  blackPlayerId: Id;
};

export type TournamentFormData = TournamentDetails & {
  // Imported results waiting to be saved, or null to keep the recorded ones
  sections: SectionInput[] | null;
  // Games imported with the results, waiting to be added to the archive
  games: GameInput[] | null;
};

export type TournamentInput = TournamentFormData & {
  modificationInfo: ModificationInfo;
};

export interface TournamentFormGroup {
  name: FormControl<string>;
  subtitle: FormControl<string>;
  date: FormControl<Date | null>;
  endDate: FormControl<Date | null>;
  format: FormControl<TournamentFormat>;
  timeControl: FormControl<string>;
  isRated: FormControl<boolean>;
  articleId: FormControl<string>;
  hasRegistration: FormControl<boolean>;
  registrationOpensDay: FormControl<Date | null>;
  registrationOpensTime: FormControl<string | null>;
  registrationClosesDay: FormControl<Date | null>;
  registrationClosesTime: FormControl<string | null>;
}

export type TournamentFormValue = {
  [Property in keyof TournamentFormGroup]: TournamentFormGroup[Property]['value'];
};

export interface PlayerNameMatch {
  name: string;
  // Null when saving the results would add the player to the archive
  playerId: Id | null;
  memberNumber: number | null;
}

// A sheet of a workbook, or a whole CSV file, with every cell read as text
export interface StandingsSheet {
  name: string;
  rows: string[][];
}

export type StandingsFileRead = { sheets: StandingsSheet[] } | { problem: string };

// A game as a PGN file records it
export interface PgnGame {
  tags: Record<string, string>;
  // The movetext with its comments and variations, on one line
  moves: string;
  plyCount: number;
}

export interface StandingsImport {
  sections: SectionInput[];
  // Every game a PGN holds, whether or not the archive already has it
  games: GameInput[];
  // Everything that stopped the import, each a sentence naming where it is
  problems: string[];
}

// Where online registration stands for a member looking at the tournament now
export type RegistrationStatus = 'none' | 'not-open' | 'open' | 'closed';

export type TournamentTiming = 'upcoming' | 'in-progress';

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

export type TrophyShape = 'cup' | 'bowl' | 'chalice';

export type TrophyMetal = 'gold' | 'silver' | 'bronze';

export interface Trophy {
  file: string;
  label: string;
  shape: TrophyShape;
  metal: TrophyMetal;
  width: number;
  height: number;
}

// A row of the preview of imported standings, its rounds labelled as the crosstable shows them
export interface ImportPreviewRow {
  id: string;
  rank: number;
  player: string;
  isNewPlayer: boolean;
  rating: string;
  score: string;
  [round: `round-${number}`]: string;
}

export interface ImportPreview {
  key: string;
  index: number;
  section: SectionInput;
  columns: DataTableColumn<ImportPreviewRow>[];
  rows: ImportPreviewRow[];
}
