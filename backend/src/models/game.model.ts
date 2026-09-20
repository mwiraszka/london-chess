import { Schema, Types, model } from 'mongoose';

import { Id } from './core.model';
import { ModificationInfo } from './modification-info.model';
import { SortingConfig } from './pagination.model';

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';

export const GAME_RESULTS: GameResult[] = ['1-0', '0-1', '1/2-1/2', '*'];

export interface Game {
  id: Id;
  tournament: string;
  section: string;
  location: string;
  year: number;
  // As much of the date as was recorded: YYYY, YYYY-MM or YYYY-MM-DD
  date: string;
  round: string;
  whitePlayerId: Id;
  blackPlayerId: Id;
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

export type GameRecord = Omit<Game, 'id'> & { _id: Types.ObjectId };

export interface GamePlayer {
  id: Id;
  firstName: string;
  lastName: string;
  suffix: string;
  memberNumber: number | null;
}

// A game as sent to clients, with both players resolved to their current names
export type GameResponse = Omit<Game, 'whitePlayerId' | 'blackPlayerId'> & {
  white: GamePlayer;
  black: GamePlayer;
};

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

const gameSchema = new Schema<Game>(
  {
    tournament: { type: String, default: '' },
    section: { type: String, default: '' },
    location: { type: String, default: '' },
    year: { type: Number, required: true },
    date: { type: String, required: true },
    round: { type: String, default: '' },
    whitePlayerId: { type: String, required: true },
    blackPlayerId: { type: String, required: true },
    result: { type: String, required: true },
    whiteElo: { type: Number, default: null },
    blackElo: { type: Number, default: null },
    eco: { type: String, default: '' },
    opening: { type: String, default: '' },
    plyCount: { type: Number, required: true },
    moves: { type: String, required: true },
    annotator: { type: String, default: '' },
    modificationInfo: { type: Object, required: true },
  },
  { versionKey: false },
);

gameSchema.index({ date: -1 });
gameSchema.index({ year: -1 });
gameSchema.index({ tournament: 1, section: 1 });
gameSchema.index({ whitePlayerId: 1 });
gameSchema.index({ blackPlayerId: 1 });

export const GameModel = model<Game>('Game', gameSchema);

export const gameSortingConfig: SortingConfig = {
  fieldMappings: {
    id: 'date',
    moves: 'plyCount',
  },
  secondarySort: {
    date: 'round',
    result: 'date',
    tournament: 'date',
    plyCount: 'date',
    moves: 'date',
    eco: 'date',
  },
  searchableFields: [],
};
