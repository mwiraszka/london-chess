import { Types } from 'mongoose';
import request from 'supertest';

import { app } from '../app';
import { Game, GameModel, GameResponse } from '../models/game.model';
import { Player, PlayerModel } from '../models/player.model';
import { useTestDatabase } from '../testing/database';
import { MODIFICATION_INFO, createMember } from '../testing/fixtures';
import { ArchivePlayer } from './games.controller';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));

async function createPlayer(
  overrides: Partial<Omit<Player, 'id'>> = {},
): Promise<string> {
  const player = await PlayerModel.create({
    firstName: 'Pat',
    lastName: 'Player',
    gameCount: 1,
    ...overrides,
  });
  return player._id.toString();
}

async function createGame(
  whitePlayerId: string,
  blackPlayerId: string,
  overrides: Partial<Omit<Game, 'id'>> = {},
): Promise<string> {
  const game = await GameModel.create({
    tournament: 'Club Championship',
    section: 'A',
    year: 1994,
    date: '1994-03-05',
    round: '1',
    whitePlayerId,
    blackPlayerId,
    result: '1-0',
    eco: 'B01',
    opening: 'Scandinavian',
    plyCount: 40,
    moves: '1. e4 d5',
    modificationInfo: MODIFICATION_INFO,
    ...overrides,
  });
  return game._id.toString();
}

describe('games routes', () => {
  useTestDatabase();

  describe('GET /v1/games', () => {
    it('should filter games by player, year and result with both players named', async () => {
      const ann = await createPlayer({ firstName: 'Ann', lastName: 'Archer' });
      const bob = await createPlayer({ firstName: 'Bob', lastName: 'Baker' });
      const cat = await createPlayer({ firstName: 'Cat', lastName: 'Cole' });
      const match = await createGame(ann, bob, { result: '0-1' });
      await createGame(bob, ann, { result: '1-0' });
      await createGame(ann, cat, { result: '0-1', year: 1995 });

      const response = await request(app).get(
        `/v1/games?filter_player=${ann}&filter_year=1994&filter_result=0-1`,
      );

      expect(response.status).toBe(200);
      const [game]: GameResponse[] = response.body.data.items;
      expect(response.body.data.items).toHaveLength(1);
      expect(game.id).toBe(match);
      expect(game.white).toMatchObject({ id: ann, lastName: 'Archer' });
      expect(game.black).toMatchObject({ id: bob, lastName: 'Baker' });
      expect(response.body.data.filteredCount).toBe(1);
      expect(response.body.data.totalCount).toBe(3);
    });

    it('should sort by the name shown for a side, using the linked member name', async () => {
      const member = await createMember({
        firstName: 'Zed',
        lastName: 'Zulu',
        number: 4,
      });
      const linked = await createPlayer({
        lastName: 'Aardvark',
        memberId: member._id.toString(),
      });
      const plain = await createPlayer({ lastName: 'Middle' });
      const opponent = await createPlayer({ lastName: 'Opponent' });
      const linkedGame = await createGame(linked, opponent);
      const plainGame = await createGame(plain, opponent);

      const response = await request(app).get(
        '/v1/games?sortBy=white&sortOrder=desc&page=1&pageSize=5',
      );

      const games: GameResponse[] = response.body.data.items;
      expect(games.map(game => game.id)).toEqual([linkedGame, plainGame]);
      expect(games[0].white).toMatchObject({
        firstName: 'Zed',
        lastName: 'Zulu',
        memberNumber: 4,
      });
    });

    it('should page through games in date order', async () => {
      const ann = await createPlayer();
      const bob = await createPlayer();
      const older = await createGame(ann, bob, { date: '1994-01-01' });
      await createGame(ann, bob, { date: '1994-02-01' });

      const response = await request(app).get(
        '/v1/games?sortBy=date&sortOrder=desc&page=2&pageSize=1',
      );

      expect(response.body.data.items.map((game: GameResponse) => game.id)).toEqual([
        older,
      ]);
    });

    it('should name a player missing from the archive as unknown', async () => {
      const missing = new Types.ObjectId().toString();
      await createGame(missing, 'not-an-id');

      const response = await request(app).get('/v1/games');

      const [game]: GameResponse[] = response.body.data.items;
      expect(game.white).toMatchObject({ id: missing, lastName: 'Unknown' });
      expect(game.black).toMatchObject({ id: 'not-an-id', lastName: 'Unknown' });
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(GameModel, 'countDocuments').mockRejectedValue(new Error('down'));

      const response = await request(app).get('/v1/games');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/games/:id', () => {
    it('should return the game', async () => {
      const ann = await createPlayer();
      const id = await createGame(ann, ann);

      const response = await request(app).get(`/v1/games/${id}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ id, moves: '1. e4 d5' });
    });

    it('should respond with not found for an unknown or malformed id', async () => {
      const unknown = await request(app).get(`/v1/games/${new Types.ObjectId()}`);
      const malformed = await request(app).get('/v1/games/not-an-id');

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(GameModel, 'findById').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get(`/v1/games/${new Types.ObjectId()}`);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/games/players', () => {
    it('should list players with games in name order', async () => {
      await createPlayer({ firstName: 'Bea', lastName: 'Smith', gameCount: 2 });
      await createPlayer({ firstName: 'Al', lastName: 'Smith', gameCount: 3 });
      await createPlayer({ firstName: 'Cy', lastName: 'Adams', gameCount: 1 });
      await createPlayer({ firstName: 'No', lastName: 'Games', gameCount: 0 });

      const response = await request(app).get('/v1/games/players');

      expect(response.status).toBe(200);
      expect(
        response.body.data.map((player: ArchivePlayer) => [
          player.firstName,
          player.lastName,
          player.gameCount,
        ]),
      ).toEqual([
        ['Cy', 'Adams', 1],
        ['Al', 'Smith', 3],
        ['Bea', 'Smith', 2],
      ]);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(PlayerModel, 'find').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get('/v1/games/players');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/games/tournaments', () => {
    it('should group the archived games by tournament', async () => {
      const ann = await createPlayer();
      await createGame(ann, ann, { tournament: 'Open', section: 'B', year: 1994 });
      await createGame(ann, ann, { tournament: 'Open', section: 'A', year: 1996 });
      await createGame(ann, ann, { tournament: 'Open', section: '', year: 1995 });
      await createGame(ann, ann, { tournament: '', section: 'A' });

      const response = await request(app).get('/v1/games/tournaments');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([
        { name: 'Open', sections: ['A', 'B'], years: [1996, 1995, 1994], gameCount: 3 },
      ]);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(GameModel, 'aggregate').mockRejectedValue(new Error('down'));

      const response = await request(app).get('/v1/games/tournaments');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/games/summary', () => {
    it('should count the archive and give its first and last years', async () => {
      const ann = await createPlayer();
      await createPlayer({ gameCount: 0 });
      await createGame(ann, ann, { tournament: 'Open', year: 1994 });
      await createGame(ann, ann, { tournament: 'Closed', year: 2001 });
      await createGame(ann, ann, { tournament: '', year: 1998 });

      const response = await request(app).get('/v1/games/summary');

      expect(response.body.data).toEqual({
        gameCount: 3,
        playerCount: 1,
        tournamentCount: 2,
        firstYear: 1994,
        lastYear: 2001,
      });
    });

    it('should have no years for an empty archive', async () => {
      const response = await request(app).get('/v1/games/summary');

      expect(response.body.data).toEqual({
        gameCount: 0,
        playerCount: 0,
        tournamentCount: 0,
        firstYear: null,
        lastYear: null,
      });
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(GameModel, 'countDocuments').mockRejectedValue(new Error('down'));

      const response = await request(app).get('/v1/games/summary');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/games/widest', () => {
    it('should include the games of the longest named players and every result', async () => {
      const longName = await createPlayer({
        firstName: 'Bartholomew',
        lastName: 'Longname-Smythe',
      });
      const short = await createPlayer({ firstName: 'Al', lastName: 'Li' });
      const longNameAsBlack = await createGame(short, longName, { result: '1/2-1/2' });
      const decisive = await createGame(short, short, { result: '1-0', date: '1994' });

      const response = await request(app).get('/v1/games/widest');

      expect(response.status).toBe(200);
      const ids = response.body.data.map((game: GameResponse) => game.id);
      expect(ids).toEqual(expect.arrayContaining([longNameAsBlack, decisive]));
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(PlayerModel, 'find').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get('/v1/games/widest');

      expect(response.status).toBe(500);
    });
  });
});
