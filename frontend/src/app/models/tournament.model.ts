import { Id, Url } from './core.model';
import { Game, GamePlayer } from './game.model';

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
  articleUrl: Url | null;
  sections: TournamentSection[];
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
> & {
  sectionCount: number;
  roundCount: number;
  playerCount: number;
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
  playerCount: number;
};

export interface Trophy {
  file: string;
  label: string;
  shape: 'cup' | 'bowl' | 'chalice';
}

// The widest values the tables show, for sizing columns before anything loads
export interface TournamentSizing {
  tournaments: Pick<Tournament, 'name' | 'subtitle'>[];
  timeControls: string[];
  players: Pick<GamePlayer, 'firstName' | 'lastName' | 'suffix'>[];
  sections: string[];
  resultNotes: string[];
  maxRounds: number;
  maxPlayers: number;
  maxSectionPlayers: number;
  maxRating: number;
  maxProvisionalGames: number;
  maxScore: number;
  hasDateRanges: boolean;
}
