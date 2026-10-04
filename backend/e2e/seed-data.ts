// The records the end-to-end suite runs against. The specs read the same values, so
// this file stays free of imports and runs in both the server and the browser tests.

export type SeedTournamentFormat = 'swiss' | 'round-robin' | 'match';
export type SeedGameResult = '1-0' | '0-1' | '1/2-1/2';

export interface SeedMember {
  key: string;
  firstName: string;
  lastName: string;
  rating: string;
  peakRating: string;
  city: string;
  isActive: boolean;
  yearOfBirth?: string;
  showYearOfBirth?: boolean;
  chessComUsername?: string;
  lichessUsername?: string;
  dateJoined?: string;
  // Members with a number have an account and so a public profile page
  number?: number;
}

export interface SeedPlayer {
  key: string;
  firstName: string;
  lastName: string;
  // The member the player is linked to
  memberKey?: string;
}

export interface SeedSection {
  name: string;
  ratingBand: string;
  roundCount: number;
  // Strongest first: each player beats everyone below them, bar the listed draws
  playerKeys: string[];
  draws: [string, string][];
  // Archive section of the section's games, when they are archived
  gameArchiveSection?: string;
}

export interface SeedTournament {
  number: number;
  name: string;
  subtitle: string;
  date: string;
  endDate: string | null;
  format: SeedTournamentFormat;
  timeControl: string;
  isRated: boolean;
  isDoubleRound?: boolean;
  gameArchiveTournament: string | null;
  sections: SeedSection[];
}

export interface SeedImage {
  id: string;
  filename: string;
  caption: string;
  album: string;
  albumCover: boolean;
  albumOrdinality: string;
  // Hue of the generated picture, so neighbouring photos look different
  hue: number;
}

export interface SeedArticle {
  id: string;
  title: string;
  body: string;
  bannerImageId: string;
  daysAgo: number;
  isBookmarked?: boolean;
}

export interface SeedEvent {
  id: string;
  title: string;
  details: string;
  type:
    | 'blitz tournament (10 mins)'
    | 'rapid tournament (25 mins)'
    | 'rapid tournament (40 mins)'
    | 'lecture'
    | 'simul'
    | 'championship'
    | 'closed'
    | 'other';
  // Negative for past events
  daysFromNow: number;
  articleId?: string;
}

export interface SeedGame {
  tournament: string;
  section: string;
  year: number;
  date: string;
  round: string;
  whiteKey: string;
  blackKey: string;
  result: SeedGameResult;
}

// Where the fake image storage serves its objects
export const STORAGE_PORT = 3100;

const hexId = (group: number, index: number): string =>
  `e2e0${String(group).padStart(4, '0')}${String(index).padStart(16, '0')}`;

export const ADMIN: SeedMember = {
  key: 'admin',
  firstName: 'Avery',
  lastName: 'Quinn',
  rating: '1720',
  peakRating: '1804',
  city: 'London',
  isActive: true,
  number: 1,
};

export const PROFILE_MEMBER: SeedMember = {
  key: 'tessa',
  firstName: 'Tessa',
  lastName: 'Marlowe',
  rating: '1850',
  peakRating: '1920',
  city: 'St. Thomas',
  isActive: true,
  yearOfBirth: '1988',
  showYearOfBirth: true,
  chessComUsername: 'tmarlowe',
  lichessUsername: 'tessamarlowe',
  dateJoined: '2019-09-05T22:00:00.000Z',
  number: 3,
};

export const RIVAL_MEMBER: SeedMember = {
  key: 'rowan',
  firstName: 'Rowan',
  lastName: 'Fairweather',
  rating: '1790',
  peakRating: '1811',
  city: 'London',
  isActive: true,
  dateJoined: '2021-01-14T23:00:00.000Z',
  number: 4,
};

// The champion's name comes from the app itself, so only the rest is set here
export const CHAMPION_MEMBER_DETAILS: Omit<SeedMember, 'firstName' | 'lastName'> = {
  key: 'champion',
  rating: '2027',
  peakRating: '2061',
  city: 'London',
  isActive: true,
  dateJoined: '2016-02-11T23:00:00.000Z',
  number: 2,
};

const OTHER_MEMBER_NAMES: [string, string, string, boolean][] = [
  ['Bram', 'Okafor', '1655', true],
  ['Celeste', 'Vandermeer', '1590/12', true],
  ['Dmitri', 'Ashgrove', '1402', true],
  ['Elif', 'Brennan', '1988', true],
  ['Farid', 'Castellan', '1301', true],
  ['Greta', 'Holloway', '1776', true],
  ['Hamish', 'Iverson', '1540', true],
  ['Ines', 'Jaramillo', '1215/8', true],
  ['Jonah', 'Kettleby', '1467', true],
  ['Keiko', 'Lindqvist', '1833', true],
  ['Lorcan', 'Mbeki', '1119', true],
  ['Mirela', 'Northcott', '1698', true],
  ['Nikolai', 'Osei', '1582', true],
  ['Odette', 'Pemberton', '1356', true],
  ['Pavel', 'Quennell', '1904', false],
  ['Rhiannon', 'Sato', '1477', false],
  ['Sven', 'Tolliver', '1632', false],
  ['Ulla', 'Varga', '1250', false],
  ['Wendell', 'Yarrow', '1709', true],
  ['Zora', 'Abernathy', '1441', true],
];

export const OTHER_MEMBERS: SeedMember[] = OTHER_MEMBER_NAMES.map(
  ([firstName, lastName, rating, isActive]) => ({
    key: lastName.toLowerCase(),
    firstName,
    lastName,
    rating,
    peakRating: rating.split('/')[0],
    city: 'London',
    isActive,
  }),
);

export const INACTIVE_MEMBER = OTHER_MEMBERS.find(member => !member.isActive)!;

export const PLAYERS: SeedPlayer[] = [
  { key: 'champion', firstName: '', lastName: '', memberKey: 'champion' },
  { key: 'tessa', firstName: 'Tessa', lastName: 'Marlowe', memberKey: 'tessa' },
  { key: 'rowan', firstName: 'Rowan', lastName: 'Fairweather', memberKey: 'rowan' },
  { key: 'okafor', firstName: 'Bram', lastName: 'Okafor', memberKey: 'okafor' },
  { key: 'brennan', firstName: 'Elif', lastName: 'Brennan', memberKey: 'brennan' },
  { key: 'holloway', firstName: 'G.', lastName: 'Holloway' },
  { key: 'lindqvist', firstName: 'Keiko', lastName: 'Lindqvist' },
  { key: 'mbeki', firstName: 'Lorcan', lastName: 'Mbeki' },
  { key: 'osei', firstName: 'Nikolai', lastName: 'Osei' },
  { key: 'pemberton', firstName: 'Odette', lastName: 'Pemberton' },
  { key: 'yarrow', firstName: 'Wendell', lastName: 'Yarrow' },
  { key: 'abernathy', firstName: 'Zora', lastName: 'Abernathy' },
  { key: 'dunmore', firstName: 'Harold', lastName: 'Dunmore' },
  { key: 'fitch', firstName: 'Ada', lastName: 'Fitch' },
];

export const CHAMPIONSHIP: SeedTournament = {
  number: 104,
  name: 'London Chess Championship',
  subtitle: '',
  date: '2025-10-02',
  endDate: '2025-11-06',
  format: 'round-robin',
  timeControl: 'G90+30',
  isRated: true,
  gameArchiveTournament: 'London Chess Championship',
  sections: [
    {
      name: '',
      ratingBand: '',
      roundCount: 5,
      playerKeys: ['champion', 'tessa', 'rowan', 'brennan', 'lindqvist', 'okafor'],
      draws: [['tessa', 'rowan']],
      gameArchiveSection: '',
    },
  ],
};

export const BLITZ: SeedTournament = {
  number: 103,
  name: 'Autumn Blitz',
  subtitle: 'Halloween Special',
  date: '2025-09-18',
  endDate: null,
  format: 'swiss',
  timeControl: 'G5+3',
  isRated: false,
  gameArchiveTournament: null,
  sections: [
    {
      name: '',
      ratingBand: '',
      roundCount: 4,
      playerKeys: [
        'tessa',
        'champion',
        'yarrow',
        'osei',
        'pemberton',
        'mbeki',
        'abernathy',
        'fitch',
      ],
      draws: [['osei', 'pemberton']],
    },
  ],
};

export const RAPID: SeedTournament = {
  number: 102,
  name: 'Summer Rapid',
  subtitle: '',
  date: '2023-07-06',
  endDate: '2023-07-27',
  format: 'swiss',
  timeControl: 'G25+5',
  isRated: true,
  gameArchiveTournament: 'Summer Rapid',
  sections: [
    {
      name: 'Open',
      ratingBand: '1600+',
      roundCount: 3,
      playerKeys: ['rowan', 'brennan', 'tessa', 'lindqvist', 'holloway', 'dunmore'],
      draws: [],
      gameArchiveSection: 'Open',
    },
    {
      name: 'U1600',
      ratingBand: 'Under 1600',
      roundCount: 3,
      playerKeys: ['okafor', 'yarrow', 'osei', 'pemberton', 'mbeki', 'abernathy'],
      draws: [['yarrow', 'osei']],
      gameArchiveSection: 'U1600',
    },
  ],
};

export const MATCH: SeedTournament = {
  number: 101,
  name: 'Challenge Match',
  subtitle: 'Marlowe vs. Fairweather',
  date: '2019-11-07',
  endDate: '2019-11-28',
  format: 'match',
  timeControl: 'G60+30',
  isRated: true,
  isDoubleRound: true,
  gameArchiveTournament: null,
  sections: [
    {
      name: '',
      ratingBand: '',
      roundCount: 2,
      playerKeys: ['tessa', 'rowan'],
      draws: [],
    },
  ],
};

export const TOURNAMENTS: SeedTournament[] = [CHAMPIONSHIP, BLITZ, RAPID, MATCH];

// Held a month after the suite runs, with registration open until the evening before
export const UPCOMING = {
  number: 105,
  name: 'Winter Rapid',
  timeControl: 'G25+5',
  daysFromNow: 30,
  registrantKeys: ['tessa'],
};

// Games of an older event that no tournament record covers
export const ARCHIVE_ONLY_TOURNAMENT = 'Fall Open';

export const ALBUMS = {
  championship: 'Championship Finals',
  picnic: 'Summer Picnic',
  banners: 'News Banners',
  unavailable: 'Storage Outage',
} as const;

function albumImages(
  group: number,
  album: string,
  captions: string[],
  firstHue: number,
): SeedImage[] {
  return captions.map((caption, index) => ({
    id: hexId(group, index + 1),
    filename: `${album.toLowerCase().replace(/ /g, '-')}-${index + 1}.jpg`,
    caption,
    album,
    albumCover: index === 0,
    albumOrdinality: String(index + 1),
    hue: (firstHue + index * 37) % 360,
  }));
}

export const CHAMPIONSHIP_IMAGES = albumImages(
  1,
  ALBUMS.championship,
  [
    'The final round underway',
    'Analysing after the last game',
    'The crosstable on the club wall',
    'Handing over the trophy',
  ],
  20,
);

export const PICNIC_IMAGES = albumImages(
  2,
  ALBUMS.picnic,
  ['Boards set up in the park', 'Blitz under the trees', 'Prize giving on the lawn'],
  120,
);

export const BANNER_IMAGES = albumImages(
  3,
  ALBUMS.banners,
  ['Club night', 'A tense endgame', 'Juniors at the board', 'The club library'],
  200,
);

// Its main image cannot be reached in storage, though its record and thumbnail are fine
export const UNAVAILABLE_IMAGE: SeedImage = albumImages(
  4,
  ALBUMS.unavailable,
  ['A photo stuck in storage'],
  300,
)[0];

export const IMAGES: SeedImage[] = [
  ...CHAMPIONSHIP_IMAGES,
  ...PICNIC_IMAGES,
  ...BANNER_IMAGES,
  UNAVAILABLE_IMAGE,
];

export const ARTICLES: SeedArticle[] = [
  {
    id: hexId(5, 1),
    title: 'Championship Decided in the Final Round',
    body: '## A tense finish\n\nThe **London Chess Championship** went down to the last game of the final round.\n\n- Five rounds\n- Six players\n- One champion',
    bannerImageId: BANNER_IMAGES[0].id,
    daysAgo: 3,
  },
  {
    id: hexId(5, 2),
    title: 'Autumn Blitz Results',
    body: 'Eight players took part in a fast and friendly evening of blitz.',
    bannerImageId: BANNER_IMAGES[1].id,
    daysAgo: 20,
  },
  {
    id: hexId(5, 3),
    title: 'Junior Program Returns',
    body: 'Our junior program is back every Saturday morning, starting next month.',
    bannerImageId: BANNER_IMAGES[2].id,
    daysAgo: 45,
  },
  {
    id: hexId(5, 4),
    title: 'Welcome to the Club',
    body: 'New to the club? Here is everything you need to know about club nights.',
    bannerImageId: BANNER_IMAGES[3].id,
    daysAgo: 400,
    isBookmarked: true,
  },
];

export const EVENTS: SeedEvent[] = [
  {
    id: hexId(6, 1),
    title: 'Club Night Blitz',
    details: 'Ten-minute games, all welcome.',
    type: 'blitz tournament (10 mins)',
    daysFromNow: -30,
  },
  {
    id: hexId(6, 2),
    title: 'Opening Lecture',
    details: 'A tour of the London System.',
    type: 'lecture',
    daysFromNow: -9,
  },
  {
    id: hexId(6, 3),
    title: 'Championship Final Round',
    details: 'The last round of the championship.',
    type: 'championship',
    daysFromNow: -3,
    articleId: ARTICLES[0].id,
  },
  {
    id: hexId(6, 4),
    title: 'Rapid Night',
    details: 'Twenty-five minutes plus five seconds per move.',
    type: 'rapid tournament (25 mins)',
    daysFromNow: 4,
  },
  {
    id: hexId(6, 5),
    title: 'Simul with the Champion',
    details: 'Take on the city champion over twenty boards.',
    type: 'simul',
    daysFromNow: 11,
  },
  {
    id: hexId(6, 6),
    title: 'Holiday Closure',
    details: 'The club is closed for the holiday.',
    type: 'closed',
    daysFromNow: 18,
  },
  {
    id: hexId(6, 7),
    title: 'Long Rapid Night',
    details: 'Forty-minute games.',
    type: 'rapid tournament (40 mins)',
    daysFromNow: 25,
  },
  {
    id: hexId(6, 8),
    title: 'Annual General Meeting',
    details: 'Club business and elections.',
    type: 'other',
    daysFromNow: 32,
  },
];

export const PAST_EVENTS = EVENTS.filter(event => event.daysFromNow < 0);
export const UPCOMING_EVENTS = EVENTS.filter(event => event.daysFromNow > 0);

export const MOVES: [eco: string, opening: string, moves: string, plyCount: number][] = [
  [
    'C88',
    'Ruy Lopez, Closed',
    '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 { The main line }',
    10,
  ],
  [
    'D53',
    "Queen's Gambit Declined",
    '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O',
    10,
  ],
  [
    'B90',
    'Sicilian Defence, Najdorf',
    '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
    10,
  ],
  [
    'E90',
    "King's Indian Defence",
    '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O',
    10,
  ],
  ['C15', 'French Defence, Winawer', '1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5 c5', 8],
  ['A29', 'English Opening, Four Knights', '1. c4 e5 2. Nc3 Nf6 3. Nf3 Nc6 4. g3 d5', 8],
];

// Twenty games of an older event, enough to fill more than one page with the rest
export const ARCHIVE_ONLY_GAMES: SeedGame[] = Array.from({ length: 20 }, (_, index) => {
  const pairs: [string, string][] = [
    ['holloway', 'dunmore'],
    ['fitch', 'holloway'],
    ['dunmore', 'fitch'],
    ['tessa', 'holloway'],
  ];
  const results: SeedGameResult[] = ['1-0', '0-1', '1/2-1/2', '1-0'];
  const [whiteKey, blackKey] = pairs[index % pairs.length];
  const year = index < 10 ? 1998 : 2004;
  return {
    tournament: ARCHIVE_ONLY_TOURNAMENT,
    section: index % 2 ? 'U1800' : 'Open',
    year,
    date: `${year}-10-${String((index % 9) + 10)}`,
    round: String((index % 5) + 1),
    whiteKey,
    blackKey,
    result: results[index % results.length],
  };
});

export interface SeedPairing {
  round: number;
  whiteKey: string;
  blackKey: string;
  // One score per game, from white's side
  whiteScores: number[];
}

export interface SeedStanding {
  rank: number;
  playerKey: string;
  score: number;
  rounds: {
    round: number;
    opponentKey: string;
    color: 'white' | 'black';
    scores: number[];
  }[];
}

// Pairs the section by the circle method, one round per rotation
export function pairSection(section: SeedSection, isDoubleRound = false): SeedPairing[] {
  const players = [...section.playerKeys];
  const pairings: SeedPairing[] = [];
  const beats = (a: string, b: string): number => {
    const isDraw = section.draws.some(
      ([x, y]) => (x === a && y === b) || (x === b && y === a),
    );
    if (isDraw) return 0.5;
    return section.playerKeys.indexOf(a) < section.playerKeys.indexOf(b) ? 1 : 0;
  };

  for (let round = 1; round <= section.roundCount; round++) {
    for (let board = 0; board < players.length / 2; board++) {
      const [first, second] = [players[board], players[players.length - 1 - board]];
      const [whiteKey, blackKey] =
        (round + board) % 2 ? [first, second] : [second, first];
      const score = beats(whiteKey, blackKey);
      pairings.push({
        round,
        whiteKey,
        blackKey,
        whiteScores: isDoubleRound ? [score, 0.5] : [score],
      });
    }
    players.splice(1, 0, players.pop()!);
  }
  return pairings;
}

// Ranked by score, ties going to the stronger player
export function standings(section: SeedSection, isDoubleRound = false): SeedStanding[] {
  const pairings = pairSection(section, isDoubleRound);
  const rows = section.playerKeys.map(playerKey => {
    const rounds = pairings
      .filter(
        ({ whiteKey, blackKey }) => whiteKey === playerKey || blackKey === playerKey,
      )
      .map(({ round, whiteKey, blackKey, whiteScores }) => {
        const isWhite = whiteKey === playerKey;
        return {
          round,
          opponentKey: isWhite ? blackKey : whiteKey,
          color: isWhite ? ('white' as const) : ('black' as const),
          scores: whiteScores.map(score => (isWhite ? score : 1 - score)),
        };
      });
    const score = rounds.reduce(
      (total, { scores }) => total + scores.reduce((sum, value) => sum + value, 0),
      0,
    );
    return { playerKey, score, rounds };
  });

  return rows
    .sort(
      (a, b) =>
        b.score - a.score ||
        section.playerKeys.indexOf(a.playerKey) - section.playerKeys.indexOf(b.playerKey),
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function rankOf(tournament: SeedTournament, playerKey: string): number | null {
  for (const section of tournament.sections) {
    const standing = standings(section, tournament.isDoubleRound).find(
      row => row.playerKey === playerKey,
    );
    if (standing) return standing.rank;
  }
  return null;
}
