import { Id } from './core.model';
import { MemberTournamentResult, PieceColor } from './tournament.model';

// The two members a head-to-head sets against each other, in the order it compares them
export type HeadToHeadSide = 'first' | 'second';

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

// Games between two members, counted from the first one's side
export interface HeadToHeadTally {
  wins: number;
  draws: number;
  losses: number;
}

// What each member scored against the other in the games of one year
export interface HeadToHeadYear {
  year: number;
  firstPoints: number;
  secondPoints: number;
}

// A tournament both members played, with how each of them finished
export interface SharedTournament {
  tournament: MemberTournamentResult['tournament'];
  first: MemberTournamentResult;
  second: MemberTournamentResult;
  // Null unless both played the same section, the only places that compare
  higher: HeadToHeadSide | null;
}

// A member plotted on a chart of several, in their own colour
export interface ChartedMember {
  number: number;
  name: string;
  // Any CSS colour
  color: string;
}

// A head-to-head game as its table shows it, its sort keys holding raw values
export interface HeadToHeadGameRow {
  id: string;
  game: HeadToHeadGame;
  date: string;
  dateLabel: string;
  tournament: string;
  section: string;
  round: number | null;
  roundLabel: string;
  white: string;
  // Null for a draw
  winner: HeadToHeadSide | null;
  result: string;
}

// A shared tournament as its table shows it, its sort keys holding raw values
export interface SharedTournamentRow {
  id: string;
  shared: SharedTournament;
  date: string;
  dateLabel: string;
  tournament: string;
  // Rank first, then the field, so a rank among more players sorts as the better result
  firstPlace: number | null;
  firstLabel: string;
  secondPlace: number | null;
  secondLabel: string;
}
