import {
  EntryInput,
  GameInput,
  RoundResult,
  SectionInput,
  TournamentInput,
} from '../models/tournament.model';
import { MODIFICATION_INFO } from '../testing/fixtures';
import {
  gamesError,
  sectionsError,
  validateTournamentInput,
} from './tournament-input.util';

function round(overrides: Partial<RoundResult> = {}): RoundResult {
  return {
    round: 1,
    outcome: 'game',
    scores: [1],
    points: 1,
    opponentRank: 2,
    color: 'white',
    ...overrides,
  };
}

function entry(overrides: Partial<EntryInput> = {}): EntryInput {
  return {
    rank: 1,
    name: 'Doe, Jane',
    playerId: null,
    rating: 1500,
    provisionalGames: null,
    score: 1,
    tiebreak: 2.5,
    rounds: [round()],
    ...overrides,
  };
}

function section(overrides: Partial<SectionInput> = {}): SectionInput {
  return {
    name: 'A',
    ratingBand: 'Open',
    roundCount: 1,
    isDoubleRound: false,
    entries: [
      entry(),
      entry({
        rank: 2,
        name: 'Roe, Rick',
        score: 0,
        rounds: [round({ scores: [0], points: 0, opponentRank: 1, color: 'black' })],
      }),
    ],
    ...overrides,
  };
}

function input(overrides: Partial<TournamentInput> = {}): TournamentInput {
  return {
    name: 'Fall Rapid',
    subtitle: '',
    date: '2026-10-15',
    endDate: null,
    format: 'swiss',
    timeControl: 'G25+5',
    isRated: true,
    articleId: '6a7f6f69f983bd7b3881d3e6',
    registrationOpens: '2026-10-01T12:00:00.000Z',
    registrationCloses: '2026-10-15T21:00:00.000Z',
    sections: [section()],
    games: null,
    modificationInfo: MODIFICATION_INFO,
    ...overrides,
  };
}

const messageOf = (value: unknown): string | null => {
  const result = validateTournamentInput(value);
  return result === 'valid' ? null : result.message;
};

describe('validateTournamentInput', () => {
  it('should accept a complete tournament and one with no results or registration', () => {
    const upcoming = input({
      sections: null,
      articleId: null,
      registrationOpens: null,
      registrationCloses: null,
    });

    expect(validateTournamentInput(input())).toBe('valid');
    expect(validateTournamentInput(upcoming)).toBe('valid');
  });

  it('should accept byes and unplayed rounds with no opponent or colour', () => {
    const bye = entry({
      rank: 3,
      name: 'Bye, Bea',
      score: 0.5,
      rounds: [
        round({
          outcome: 'half-point-bye',
          scores: [],
          points: 0.5,
          opponentRank: null,
          color: null,
        }),
      ],
    });

    expect(
      validateTournamentInput(
        input({ sections: [section({ entries: [...section().entries, bye] })] }),
      ),
    ).toBe('valid');
  });

  it('should reject details the site cannot store', () => {
    expect(messageOf(null)).toBe('not a valid object.');
    expect(messageOf(input({ name: '  ' }))).toBe('the tournament needs a name');
    expect(messageOf(input({ date: '15/10/2026' }))).toBe(
      'date must be a day written as YYYY-MM-DD',
    );
    expect(messageOf(input({ date: '2026-02-30' }))).toBe(
      'date must be a day written as YYYY-MM-DD',
    );
    expect(messageOf(input({ date: '2026-13-01' }))).toBe(
      'date must be a day written as YYYY-MM-DD',
    );
    expect(messageOf(input({ endDate: '2026-10-14' }))).toBe(
      'end date must be a day on or after the start date',
    );
    expect(messageOf(input({ endDate: 'soon' }))).toBe(
      'end date must be a day on or after the start date',
    );
    expect(messageOf(input({ format: 'knockout' as TournamentInput['format'] }))).toBe(
      'format is not one the site knows',
    );
    expect(messageOf(input({ timeControl: '25 minutes' }))).toBe(
      'time control must look like G25, G25+5 or 3 hours',
    );
    expect(
      messageOf(
        input({
          articleId: 'https://londonchess.ca/article/view/6a7f6f69f983bd7b3881d3e6',
        }),
      ),
    ).toBe('article ID must be 24 hexadecimal characters');
  });

  it('should reject a registration window that is incomplete, malformed or backwards', () => {
    expect(messageOf(input({ registrationCloses: null }))).toBe(
      'registration needs both an opening and a closing time',
    );
    expect(messageOf(input({ registrationOpens: '2026-10-01 12:00' }))).toBe(
      'registration times must be ISO 8601 instants',
    );
    expect(messageOf(input({ registrationCloses: 'tomorrow' }))).toBe(
      'registration times must be ISO 8601 instants',
    );
    expect(messageOf(input({ registrationCloses: '2026-10-01T12:00:00.000Z' }))).toBe(
      'registration must close after it opens',
    );
  });

  it('should reject malformed sections', () => {
    expect(messageOf(input({ sections: {} as SectionInput[] }))).toBe(
      'sections must be a list',
    );
    expect(messageOf(input({ sections: [section({ roundCount: 1.5 })] }))).toBe(
      'section A has an invalid round count',
    );
    expect(messageOf(input({ sections: [section({ entries: [] })] }))).toBe(
      'section A has no players',
    );
    expect(messageOf(input({ sections: [section(), section()] }))).toBe(
      'section A appears twice',
    );
    expect(
      messageOf(input({ sections: [{ ...section(), extra: true } as SectionInput] })),
    ).toMatch(/^a section: /);
    expect(
      messageOf(
        input({ sections: [section({ name: '', entries: [entry({ rank: 0 })] })] }),
      ),
    ).toBe('the section has an invalid rank');
    expect(
      messageOf(input({ sections: [section({ entries: [entry(), entry()] })] })),
    ).toBe('section A has rank 1 twice');
  });

  it('should reject malformed entries', () => {
    const withEntry = (overrides: Partial<EntryInput>) =>
      input({
        sections: [
          section({
            entries: [
              entry({ rounds: [], ...overrides }),
              entry({ rank: 2, rounds: [] }),
            ],
          }),
        ],
      });

    expect(messageOf(withEntry({ name: ' ' }))).toBe(
      'section A, rank 1 has no player name',
    );
    expect(messageOf(withEntry({ rating: 4000 }))).toBe(
      'section A, rank 1 has an invalid rating',
    );
    expect(messageOf(withEntry({ provisionalGames: 0 }))).toBe(
      'section A, rank 1 has an invalid provisional game count',
    );
    expect(messageOf(withEntry({ score: 1.25 }))).toBe(
      'section A, rank 1 has an invalid score',
    );
    expect(messageOf(withEntry({ tiebreak: Number.NaN }))).toBe(
      'section A, rank 1 has an invalid tiebreak',
    );
    expect(messageOf(withEntry({ rounds: {} as RoundResult[] }))).toBe(
      'section A, rank 1 has no list of rounds',
    );
    expect(messageOf(withEntry({ name: 7 as unknown as string }))).toMatch(
      /^section A, an entry: /,
    );
  });

  it('should reject malformed rounds', () => {
    const withRounds = (rounds: RoundResult[]) =>
      input({
        sections: [
          section({ entries: [entry({ rounds }), entry({ rank: 2, rounds: [] })] }),
        ],
      });

    expect(messageOf(withRounds([round({ round: 2 })]))).toBe(
      "section A, rank 1, a round is not one of the section's 1 rounds",
    );
    expect(
      messageOf(withRounds([round({ outcome: 'draw' as RoundResult['outcome'] })])),
    ).toBe('section A, rank 1, a round has an unknown outcome');
    expect(messageOf(withRounds([round({ scores: [2] })]))).toBe(
      'section A, rank 1, a round has invalid game scores',
    );
    expect(messageOf(withRounds([round({ points: -1 })]))).toBe(
      'section A, rank 1, a round has invalid points',
    );
    expect(messageOf(withRounds([round({ opponentRank: 9 })]))).toBe(
      'section A, rank 1, a round names an opponent who is not in the section',
    );
    expect(messageOf(withRounds([round({ color: 'red' as RoundResult['color'] })]))).toBe(
      'section A, rank 1, a round has an unknown colour',
    );
    expect(messageOf(withRounds([round(), round()]))).toBe(
      'section A, rank 1 has round 1 twice',
    );
    expect(messageOf(withRounds([{ ...round(), extra: 1 } as RoundResult]))).toMatch(
      /^section A, rank 1, a round: /,
    );
  });
});

describe('games from a pgn', () => {
  const game = (): GameInput => ({
    section: 'A',
    round: '1',
    date: '2026-10-15',
    whitePlayerId: '6a7f6f69f983bd7b3881d3e6',
    blackPlayerId: '6a7f6f69f983bd7b3881d3e7',
    result: '1-0',
    whiteElo: 1500,
    blackElo: null,
    eco: 'C20',
    plyCount: 3,
    moves: '1. e4 e5 2. Qh5 1-0',
  });

  const withField = (
    field: keyof GameInput,
    value: unknown,
  ): Record<string, unknown> => ({
    ...game(),
    [field]: value,
  });

  it('should accept games that come with the results they belong to', () => {
    expect(messageOf(input({ games: [game()] }))).toBeNull();
    expect(gamesError([game()])).toBeNull();
  });

  it('should refuse games without results, and games it cannot store', () => {
    expect(messageOf(input({ sections: null, games: [game()] }))).toBe(
      'games can only be added along with the results they belong to',
    );
    expect(gamesError('games')).toBe('games must be a list of at most 2000');
    expect(gamesError([withField('round', 'final')])).toBe('game 1 has an invalid round');
    expect(gamesError([withField('date', '2026-02-30')])).toBe(
      'game 1 has an invalid date',
    );
    expect(gamesError([withField('blackPlayerId', game().whitePlayerId)])).toBe(
      'game 1 has invalid players',
    );
    expect(gamesError([withField('result', 'win')])).toBe('game 1 has an unknown result');
    expect(gamesError([withField('whiteElo', 5000)])).toBe(
      'game 1 has an invalid rating',
    );
    expect(gamesError([withField('eco', 'Z1')])).toBe('game 1 has an invalid ECO code');
    expect(gamesError([withField('moves', ' ')])).toBe('game 1 has no moves');
    expect(gamesError([{ section: 'A' }])).toMatch(/^game 1: /);
  });

  it('should refuse a section list it cannot read, and an entry with a malformed player', () => {
    expect(sectionsError('sections')).toBe('sections must be a list');
    expect(
      messageOf(
        input({ sections: [section({ entries: [entry({ playerId: 'player-1' })] })] }),
      ),
    ).toBe('section A, rank 1 has an invalid player ID');
  });
});
