import { Game, GameResult, GamesQuery, GamesSortBy } from '@app/models';

export const GAME_RESULTS: GameResult[] = ['1-0', '0-1', '1/2-1/2', '*'];

export const GAMES_SORT_FIELDS: GamesSortBy[] = ['date', 'tournament', 'eco', 'moves'];

export const GAMES_PAGE_SIZES = [25, 50, 100];

// A random game's die shows this many faces, this many milliseconds apart
export const DIE_ROLL_FRAMES = 20;
export const DIE_ROLL_INTERVAL = 100;

// The archive figures count up to their amounts over this long, a frame this often
export const FIGURE_COUNT_UP_DURATION = 3000;
export const FIGURE_COUNT_UP_INTERVAL = 30;

export const INITIAL_GAMES_QUERY: GamesQuery = {
  page: 1,
  pageSize: 25,
  sortBy: 'date',
  sortOrder: 'desc',
  filters: {
    player: '',
    tournament: '',
    section: '',
    year: null,
    result: '',
  },
};

// Shaped like a typical game, so a loading skeleton sized by it matches the real page
export const PLACEHOLDER_GAME: Game = {
  id: '',
  tournament: 'Club Championship',
  section: 'A',
  location: 'London',
  year: 2000,
  date: '2000-01-01',
  round: '1',
  white: {
    id: '',
    firstName: 'White',
    lastName: 'Player',
    suffix: '',
    memberNumber: null,
  },
  black: {
    id: '',
    firstName: 'Black',
    lastName: 'Player',
    suffix: '',
    memberNumber: null,
  },
  result: '*',
  whiteElo: null,
  blackElo: null,
  eco: 'C00',
  opening: 'Opening',
  plyCount: 2,
  moves: '1. e4 e5 *',
  annotator: '',
  modificationInfo: {
    dateCreated: '',
    createdBy: '',
    createdByNumber: null,
    dateLastEdited: '',
    lastEditedBy: '',
    lastEditedByNumber: null,
  },
};
