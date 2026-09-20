import { Id, Url } from './core.model';
import { Game, GamePlayer } from './game.model';

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
  // The game in the archive, when it was recorded
  gameId: Id | null;
}

export interface TournamentEntry {
  rank: number;
  player: GamePlayer;
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

export type TournamentGame = Pick<
  Game,
  'id' | 'section' | 'round' | 'date' | 'white' | 'black' | 'result'
>;

export interface TournamentSection {
  // Empty for a tournament with a single section
  name: string;
  ratingBand: string;
  roundCount: number;
  // Every pairing plays two games, one with each color
  isDoubleRound: boolean;
  entries: TournamentEntry[];
  games: TournamentGame[];
}

export interface Tournament {
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

export interface Trophy {
  // The file in the assets
  file: string;
  label: string;
  // Small trophies stand a little lower in a row than the others
  size: 'regular' | 'small';
}

// The widest values the tournament tables show, so their columns are sized before anything loads
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
