import { GameArchiveLink } from './mappings.model';

const sameSections = (...names: string[]): Record<string, string[]> =>
  Object.fromEntries(names.map(name => [name, [name]]));

// Keyed by tournament number. The archive files a year's finals, matches and
// playoffs under the championship itself.
export const GAME_ARCHIVE_LINKS: Record<number, GameArchiveLink> = {
  9: {
    tournament: 'Team Tournament',
    sections: sameSections(
      'Board 1',
      'Board 2',
      'Board 3',
      'Board 4',
      'Board 5',
      'Board 6',
      'Board 7',
      'Board 8',
      'Board 9',
    ),
  },
  12: {
    tournament: 'Active Championship',
    sections: sameSections(''),
  },
  50: {
    tournament: 'Club Championship',
    sections: sameSections('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
  },
  51: {
    tournament: 'Club Championship',
    sections: { A: ['Match'] },
  },
  86: {
    tournament: 'Club Championship',
    sections: sameSections('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'),
  },
  87: {
    tournament: 'Club Championship',
    sections: {
      A: ['A Match'],
      B: ['B Match', 'B Match Playoff'],
      C: ['C Match'],
      D: ['D Match'],
    },
  },
  118: {
    tournament: 'Club Championship',
    sections: sameSections('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D', 'E'),
  },
  119: {
    tournament: 'Club Championship',
    sections: {
      A: ['A Match', 'A Match Playoff'],
      B: ['B Match', 'B Match Playoff'],
      C: ['C Match', 'C Match Playoff'],
    },
  },
  150: {
    tournament: 'Club Championship',
    sections: {
      ...sameSections('A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E', 'F', 'G', 'YA'),
      A1: ['A1', 'A1 Playoff'],
    },
  },
  151: {
    tournament: 'Club Championship',
    sections: {
      A: ['A Match'],
      B: ['B Match'],
      C: ['C Match', 'C Match Playoff'],
      D: ['D Match'],
    },
  },
};
