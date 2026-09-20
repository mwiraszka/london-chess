import { Id } from './core.model';
import { ModificationInfo } from './modification-info.model';

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';

export interface GamePlayer {
  id: Id;
  // An initial such as "G." when the archive never recorded the full name
  firstName: string;
  lastName: string;
  suffix: string;
  // Set when the player is a member with a profile page
  memberNumber: number | null;
}

export interface Game {
  id: Id;
  tournament: string;
  section: string;
  location: string;
  year: number;
  // As much of the date as was recorded: YYYY, YYYY-MM or YYYY-MM-DD
  date: string;
  round: string;
  white: GamePlayer;
  black: GamePlayer;
  result: GameResult;
  whiteElo: number | null;
  blackElo: number | null;
  eco: string;
  opening: string;
  plyCount: number;
  // The moves with their comments and variations, as PGN movetext
  moves: string;
  annotator: string;
  modificationInfo: ModificationInfo;
}

export interface ArchivePlayer extends GamePlayer {
  gameCount: number;
}

export interface ArchiveTournament {
  name: string;
  sections: string[];
  years: number[];
  gameCount: number;
}

export interface GamesSummary {
  gameCount: number;
  playerCount: number;
  tournamentCount: number;
  firstYear: number | null;
  lastYear: number | null;
}

// The widest values the game archives table shows, so its columns are sized before any game loads
export interface ArchiveSizing {
  players: Pick<GamePlayer, 'firstName' | 'lastName' | 'suffix'>[];
  events: { tournament: string; section: string }[];
  openings: { eco: string; name: string }[];
  longestGame: number;
}

export interface GameFilters {
  player: Id | '';
  year: number | null;
  result: GameResult | '';
}

export type GamesSortBy =
  'date' | 'white' | 'result' | 'black' | 'tournament' | 'eco' | 'moves';

export interface GamesQuery {
  page: number;
  pageSize: number;
  sortBy: GamesSortBy;
  sortOrder: 'asc' | 'desc';
  filters: GameFilters;
}
