import { Types } from 'mongoose';

import { GameModel, GameRecord } from '../models/game.model';
import { ModificationInfo } from '../models/modification-info.model';
import { PlayerModel } from '../models/player.model';
import {
  GameInput,
  TournamentEntry,
  TournamentModel,
  TournamentSection,
} from '../models/tournament.model';
import { useTestDatabase } from '../testing/database';
import { MODIFICATION_INFO } from '../testing/fixtures';
import {
  archiveGames,
  classifyGames,
  withGameSections,
  withNamedGameSections,
} from './tournament-games.service';

const NUMBER = 184;
const TOURNAMENT = 'Club Championship';
const YEAR = 2026;

const EDIT: ModificationInfo = {
  dateCreated: '2026-10-05T12:00:00.000Z',
  createdBy: 'Ada Admin',
  createdByNumber: 100,
  dateLastEdited: '2026-10-05T12:00:00.000Z',
  lastEditedBy: 'Ada Admin',
  lastEditedByNumber: 100,
};

async function createPlayer(lastName: string): Promise<string> {
  const { _id } = await PlayerModel.create({
    firstName: 'Pat',
    lastName,
    suffix: '',
    memberId: null,
    gameCount: 3,
  });
  return _id.toString();
}

const game = (
  white: string,
  black: string,
  overrides: Partial<GameInput> = {},
): GameInput => ({
  section: 'A1',
  round: '1',
  date: '2026-09-24',
  whitePlayerId: white,
  blackPlayerId: black,
  result: '1-0',
  whiteElo: 1800,
  blackElo: 1750,
  eco: 'C60',
  plyCount: 3,
  moves: '1. e4 e5 2. Nf3 1-0',
  notCounted: false,
  notCountedReason: '',
  archivedGameId: null,
  ...overrides,
});

async function archive(input: GameInput): Promise<void> {
  await GameModel.create({
    ...input,
    tournament: TOURNAMENT,
    location: 'London',
    year: 2026,
    opening: 'Ruy Lopez',
    annotator: '',
    modificationInfo: MODIFICATION_INFO,
  });
}

const entry = (playerId: string): TournamentEntry => ({
  rank: 1,
  playerId,
  rating: null,
  provisionalGames: null,
  performanceRating: null,
  score: null,
  tiebreak: null,
  rounds: [],
  resultNote: '',
});

const section = (
  playerIds: string[],
  gameArchiveSections: string[],
): TournamentSection => ({
  name: 'A1',
  ratingBand: '',
  roundCount: 5,
  isDoubleRound: false,
  gameArchiveSections,
  entries: playerIds.map(entry),
});

const gameCount = async (id: string): Promise<number | undefined> =>
  (await PlayerModel.findById(id).lean())?.gameCount;

describe('tournament games', () => {
  useTestDatabase();

  let anna: string;
  let boris: string;
  let clara: string;

  beforeEach(async () => {
    [anna, boris, clara] = await Promise.all(
      ['Black', 'White', 'Green'].map(createPlayer),
    );
  });

  describe('classifyGames', () => {
    it('should tell new, changed and unchanged games apart', async () => {
      await archive(game(anna, boris));
      await archive(game(anna, clara, { round: '2' }));

      const { changes } = await classifyGames(NUMBER, TOURNAMENT, YEAR, [
        game(anna, boris, { moves: '1. e4   e5\n2. Nf3 1-0' }),
        game(anna, clara, { round: '2', result: '1/2-1/2' }),
        game(boris, clara, { round: '3' }),
        game(clara, anna, { round: '2' }),
      ]);

      expect(changes).toEqual(['unchanged', 'changed', 'new', 'changed']);
    });

    it('should not look up the archive for no games', async () => {
      const result = await classifyGames(NUMBER, TOURNAMENT, YEAR, []);

      expect(result).toEqual({ changes: [], candidates: [] });
    });

    it('should count a change to whether a game counts, or to its reason', async () => {
      await archive(game(anna, boris));

      const { changes } = await classifyGames(NUMBER, TOURNAMENT, YEAR, [
        game(anna, boris, { notCounted: true, notCountedReason: 'Withdrew' }),
        game(anna, boris, { notCountedReason: 'Ignored while counted' }),
      ]);

      expect(changes).toEqual(['changed', 'unchanged']);
    });

    it('should offer the game archived in the same round with one of its players', async () => {
      const misspelt = await createPlayer('Whyte');
      await archive(game(anna, misspelt, { round: '3' }));
      await archive(game(anna, clara, { round: '4' }));
      await GameModel.create({
        ...game(anna, boris, { round: '3' }),
        tournament: 'Blitz',
        location: 'London',
        year: YEAR,
        opening: '',
        annotator: '',
        modificationInfo: MODIFICATION_INFO,
      });

      const { candidates } = await classifyGames(NUMBER, TOURNAMENT, YEAR, [
        game(anna, boris, { round: '3' }),
      ]);

      expect(candidates[0].map(({ white, black }) => [white.id, black.id])).toEqual([
        [anna, misspelt],
      ]);
    });

    it("should not offer a game another tournament's results link to a round", async () => {
      await archive(game(anna, boris, { round: '1' }));
      await TournamentModel.create({
        number: NUMBER,
        name: 'Championship',
        date: '2026-09-24',
        format: 'round-robin',
        gameArchiveTournament: TOURNAMENT,
        sections: [
          {
            ...section([], ['A1']),
            entries: [
              {
                ...entry(anna),
                rounds: [
                  {
                    round: 1,
                    outcome: 'game',
                    scores: [1],
                    points: 1,
                    opponentRank: 2,
                    color: 'white',
                  },
                ],
              },
              {
                ...entry(boris),
                rank: 2,
                rounds: [
                  {
                    round: 1,
                    outcome: 'game',
                    scores: [0],
                    points: 0,
                    opponentRank: 1,
                    color: 'black',
                  },
                ],
              },
            ],
          },
        ],
      });

      const { candidates } = await classifyGames(150, TOURNAMENT, 2025, [
        game(anna, boris, { section: 'A', round: '6' }),
      ]);

      expect(candidates).toEqual([[]]);
    });
  });

  describe('withGameSections', () => {
    it("should add the archive sections of the games a section's players played", () => {
      const sections = [section([anna, boris], ['A1'])];

      const result = withGameSections(sections, [
        game(anna, clara, { section: 'YS' }),
        game(boris, anna, { section: 'A1' }),
        game(clara, new Types.ObjectId().toString(), { section: 'B1' }),
      ]);

      expect(result[0].gameArchiveSections).toEqual(['A1', 'YS']);
    });
  });

  describe('withNamedGameSections', () => {
    it("should add the archive's games filed under a section's name that year", async () => {
      await archive(game(anna, boris, { section: 'A Match' }));
      await GameModel.create({
        ...game(anna, clara, { section: 'B Match' }),
        tournament: TOURNAMENT,
        location: 'London',
        year: 2025,
        opening: '',
        annotator: '',
        modificationInfo: MODIFICATION_INFO,
      });

      const result = await withNamedGameSections(
        [
          section([anna], ['A1']),
          { ...section([anna], []), name: 'A MATCH' },
          { ...section([clara], []), name: 'B Match' },
        ],
        TOURNAMENT,
        YEAR,
      );

      expect(result.map(({ gameArchiveSections }) => gameArchiveSections)).toEqual([
        ['A1'],
        ['A Match'],
        [],
      ]);
    });
  });

  describe('archiveGames', () => {
    it('should add each new game once and count it for both players', async () => {
      await archiveGames(TOURNAMENT, YEAR, [game(anna, boris), game(anna, boris)], EDIT);

      const games = await GameModel.find({ tournament: TOURNAMENT }).lean<GameRecord[]>();
      expect(games).toHaveLength(1);
      expect(games[0]).toMatchObject({
        section: 'A1',
        location: 'London',
        year: 2026,
        round: '1',
        result: '1-0',
        opening: expect.any(String),
        annotator: '',
        modificationInfo: EDIT,
      });
      expect(await gameCount(anna)).toBe(4);
      expect(await gameCount(boris)).toBe(4);
      expect(await gameCount(clara)).toBe(3);
    });

    it('should rewrite a changed game, keeping who first archived it', async () => {
      await archive(game(anna, boris));

      await archiveGames(TOURNAMENT, YEAR, [game(anna, boris, { result: '0-1' })], EDIT);

      const [stored] = await GameModel.find({ tournament: TOURNAMENT }).lean<
        GameRecord[]
      >();
      expect(stored.result).toBe('0-1');
      expect(stored.modificationInfo).toEqual({
        ...MODIFICATION_INFO,
        lastEditedBy: EDIT.lastEditedBy,
        lastEditedByNumber: EDIT.lastEditedByNumber,
        dateLastEdited: EDIT.dateLastEdited,
      });
      expect(await gameCount(anna)).toBe(3);
    });

    it('should keep a game in its place when a correction gives it the other colours', async () => {
      await archive(game(anna, boris));

      await archiveGames(
        TOURNAMENT,
        YEAR,
        [game(boris, anna, { result: '0-1', whiteElo: 1750, blackElo: 1800 })],
        EDIT,
      );

      const games = await GameModel.find({ tournament: TOURNAMENT }).lean<GameRecord[]>();
      expect(games).toHaveLength(1);
      expect(games[0]).toMatchObject({
        whitePlayerId: boris,
        blackPlayerId: anna,
        result: '0-1',
      });
      expect(await gameCount(anna)).toBe(3);
    });

    it("should file a game under the tournament's year, whatever its date", async () => {
      await archiveGames(
        TOURNAMENT,
        2025,
        [game(anna, boris, { date: '2026-01-15' })],
        EDIT,
      );

      const [stored] = await GameModel.find({ tournament: TOURNAMENT }).lean<
        GameRecord[]
      >();
      expect(stored).toMatchObject({ year: 2025, date: '2026-01-15' });
    });

    it('should give the player a game confirmed to be an archived one was taken from', async () => {
      const misspelt = await createPlayer('Whyte');
      await archive(game(anna, misspelt));
      const [stored] = await GameModel.find({ tournament: TOURNAMENT }).lean<
        GameRecord[]
      >();

      const replaced = await archiveGames(
        TOURNAMENT,
        YEAR,
        [game(anna, boris, { archivedGameId: stored._id.toString() })],
        EDIT,
      );

      expect(replaced).toEqual([misspelt]);
      expect(await gameCount(misspelt)).toBe(2);
      expect(await gameCount(boris)).toBe(4);
    });

    it('should leave untouched a game the archive already holds as it is', async () => {
      await archive(game(anna, boris));

      await archiveGames(TOURNAMENT, YEAR, [game(anna, boris)], EDIT);

      const [stored] = await GameModel.find({ tournament: TOURNAMENT }).lean<
        GameRecord[]
      >();
      expect(stored.modificationInfo).toEqual(MODIFICATION_INFO);
      expect(await gameCount(anna)).toBe(3);
    });
  });
});
