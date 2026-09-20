import { ArchivePlayer, ArchiveTournament, Game, GamesSummary } from '@app/models';

import { MOCK_MODIFICATION_INFOS } from './modification-info.mock';

export const MOCK_GAMES: Game[] = [
  {
    id: '64b7f0c2a1d3e4f5a6b7c8d1',
    tournament: 'Fall Open',
    section: 'U1800',
    location: 'London',
    year: 1994,
    date: '1994-10',
    round: '3',
    white: {
      id: '64b7f0c2a1d3e4f5a6b7c8a1',
      firstName: 'Gerry',
      lastName: 'Litchfield',
      suffix: '',
      memberNumber: 2,
    },
    black: {
      id: '64b7f0c2a1d3e4f5a6b7c8a2',
      firstName: 'H.',
      lastName: 'Jung',
      suffix: '',
      memberNumber: null,
    },
    result: '1-0',
    whiteElo: 1850,
    blackElo: 1990,
    eco: 'B22',
    opening: 'Sicilian Defence, Alapin Variation',
    plyCount: 5,
    moves: '1. e4 c5 2. c3 { A comment } 2... d5 3. exd5 1-0',
    annotator: 'Litchfield, G.',
    modificationInfo: MOCK_MODIFICATION_INFOS[0],
  },
  {
    id: '64b7f0c2a1d3e4f5a6b7c8d2',
    tournament: 'Club Championship',
    section: 'A1',
    location: 'London',
    year: 2023,
    date: '2023-12-07',
    round: '1',
    white: {
      id: '64b7f0c2a1d3e4f5a6b7c8a3',
      firstName: 'Sasha',
      lastName: 'Chen',
      suffix: '',
      memberNumber: null,
    },
    black: {
      id: '64b7f0c2a1d3e4f5a6b7c8a1',
      firstName: 'Gerry',
      lastName: 'Litchfield',
      suffix: '',
      memberNumber: 2,
    },
    result: '1/2-1/2',
    whiteElo: 2000,
    blackElo: null,
    eco: 'D02',
    opening: 'London System',
    plyCount: 4,
    moves: '1. d4 d5 2. Nf3 Nf6 1/2-1/2',
    annotator: '',
    modificationInfo: MOCK_MODIFICATION_INFOS[0],
  },
  {
    id: '64b7f0c2a1d3e4f5a6b7c8d3',
    tournament: '',
    section: '',
    location: '',
    year: 1991,
    date: '1991',
    round: '',
    white: {
      id: '64b7f0c2a1d3e4f5a6b7c8a4',
      firstName: '',
      lastName: 'Oraha',
      suffix: '',
      memberNumber: null,
    },
    black: {
      id: '64b7f0c2a1d3e4f5a6b7c8a3',
      firstName: 'Sasha',
      lastName: 'Chen',
      suffix: '',
      memberNumber: null,
    },
    result: '0-1',
    whiteElo: null,
    blackElo: null,
    eco: '',
    opening: '',
    plyCount: 2,
    moves: '1. e4 e5 0-1',
    annotator: '',
    modificationInfo: MOCK_MODIFICATION_INFOS[0],
  },
];

export const MOCK_ARCHIVE_PLAYERS: ArchivePlayer[] = [
  { ...MOCK_GAMES[1].white, gameCount: 2 },
  { ...MOCK_GAMES[0].black, gameCount: 1 },
  { ...MOCK_GAMES[0].white, gameCount: 2 },
  { ...MOCK_GAMES[2].white, gameCount: 1 },
];

export const MOCK_ARCHIVE_TOURNAMENTS: ArchiveTournament[] = [
  {
    name: 'Club Championship',
    sections: ['A1', 'B1'],
    years: [2023, 2022],
    gameCount: 40,
  },
  { name: 'Fall Open', sections: ['U1600', 'U1800'], years: [1994], gameCount: 30 },
];

export const MOCK_GAMES_SUMMARY: GamesSummary = {
  gameCount: 9119,
  playerCount: 989,
  tournamentCount: 189,
  firstYear: 1974,
  lastYear: 2026,
};
