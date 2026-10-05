import { Types } from 'mongoose';

import { GameModel, GameRecord } from '../models/game.model';
import { ModificationInfo } from '../models/modification-info.model';
import { PlayerModel } from '../models/player.model';
import {
  GameInput,
  TournamentEntry,
  TournamentSection,
} from '../models/tournament.model';
import { useTestDatabase } from '../testing/database';
import { MODIFICATION_INFO } from '../testing/fixtures';
import {
  archiveGames,
  classifyGames,
  withGameSections,
} from './tournament-games.service';

const TOURNAMENT = 'Club Championship';

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

      const changes = await classifyGames(TOURNAMENT, [
        game(anna, boris, { moves: '1. e4   e5\n2. Nf3 1-0' }),
        game(anna, clara, { round: '2', result: '1/2-1/2' }),
        game(boris, clara, { round: '3' }),
      ]);

      expect(changes).toEqual(['unchanged', 'changed', 'new']);
    });

    it('should not look up the archive for no games', async () => {
      const changes = await classifyGames(TOURNAMENT, []);

      expect(changes).toEqual([]);
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

  describe('archiveGames', () => {
    it('should add each new game once and count it for both players', async () => {
      await archiveGames(TOURNAMENT, [game(anna, boris), game(anna, boris)], EDIT);

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

      await archiveGames(TOURNAMENT, [game(anna, boris, { result: '0-1' })], EDIT);

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

    it('should leave untouched a game the archive already holds as it is', async () => {
      await archive(game(anna, boris));

      await archiveGames(TOURNAMENT, [game(anna, boris)], EDIT);

      const [stored] = await GameModel.find({ tournament: TOURNAMENT }).lean<
        GameRecord[]
      >();
      expect(stored.modificationInfo).toEqual(MODIFICATION_INFO);
      expect(await gameCount(anna)).toBe(3);
    });
  });
});
