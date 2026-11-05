import { Types } from 'mongoose';
import request from 'supertest';

import { app } from '../app';
import { Game, GameModel, GameResponse, MemberOpenings } from '../models/game.model';
import { Player, PlayerModel } from '../models/player.model';
import {
  HeadToHeadGame,
  RoundResult,
  TournamentEntry,
  TournamentModel,
  TournamentSection,
} from '../models/tournament.model';
import { useTestDatabase } from '../testing/database';
import { MODIFICATION_INFO, createMember, memberAccount } from '../testing/fixtures';
import { INSERTION_ORDER, TIED_IDS, idsPageByPage } from '../testing/paging';
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
  overrides: Partial<Omit<Game, 'id'>> & { _id?: Types.ObjectId } = {},
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

function entry(rank: number, playerId: string, rounds: RoundResult[]): TournamentEntry {
  return {
    rank,
    playerId,
    rating: 1500,
    provisionalGames: null,
    performanceRating: null,
    score: null,
    tiebreak: null,
    rounds,
    resultNote: '',
  };
}

function section(
  entries: TournamentEntry[],
  overrides: Partial<TournamentSection> = {},
): TournamentSection {
  return {
    name: 'Open',
    ratingBand: '',
    roundCount: 3,
    isDoubleRound: false,
    gameArchiveSections: ['A'],
    entries,
    ...overrides,
  };
}

async function createTournament(sections: TournamentSection[]): Promise<void> {
  await TournamentModel.create({
    number: 5,
    name: 'Club Championship 2023',
    date: '2023-09-14',
    format: 'round-robin',
    timeControl: 'G80',
    isRated: true,
    gameArchiveTournament: 'Club Championship',
    sections,
  });
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

    it('should page through games that tie on every sorted field once each, in one order', async () => {
      const ann = await createPlayer({ firstName: 'Ann', lastName: 'Archer' });
      const bob = await createPlayer({ firstName: 'Bob', lastName: 'Baker' });
      for (const _id of INSERTION_ORDER) {
        await createGame(ann, bob, { _id });
      }

      const ids = await idsPageByPage('/v1/games?sortBy=date&sortOrder=desc');

      expect(ids).toEqual([...TIED_IDS].reverse().map(String));
    });

    it("should page through one player's games on the same day once each, in one order", async () => {
      const ann = await createPlayer({ firstName: 'Ann', lastName: 'Archer' });
      const bob = await createPlayer({ firstName: 'Bob', lastName: 'Baker' });
      for (const _id of INSERTION_ORDER) {
        await createGame(ann, bob, { _id });
      }

      const ids = await idsPageByPage('/v1/games?sortBy=white&sortOrder=asc');

      expect(ids).toEqual([...TIED_IDS].reverse().map(String));
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

  describe('GET /v1/games/members/:number/openings', () => {
    it("should count the member's opening families by the colour they played", async () => {
      const member = await createMember({
        number: 7,
        account: memberAccount({ clerkUserId: 'user_member' }),
      });
      const linked = await createPlayer({ memberId: member._id.toString() });
      const other = await createPlayer({ lastName: 'Other' });
      await createGame(linked, other, {
        opening: 'Sicilian Defense: Najdorf Variation, English Attack',
      });
      await createGame(linked, other, { opening: 'Sicilian Defense: Dragon Variation' });
      await createGame(linked, other, { opening: 'Italian Game' });
      await createGame(other, linked, { opening: 'French Defense' });
      await createGame(other, linked, { opening: '' });
      await createGame(other, other, { opening: 'Ruy Lopez' });

      const response = await request(app).get('/v1/games/members/7/openings');

      expect(response.status).toBe(200);
      const openings: MemberOpenings = response.body.data;
      expect(openings).toEqual({
        white: [
          { opening: 'Sicilian Defense', gameCount: 2 },
          { opening: 'Italian Game', gameCount: 1 },
        ],
        black: [{ opening: 'French Defense', gameCount: 1 }],
      });
    });

    it('should have no openings for a member without archived players', async () => {
      await createMember({ number: 7, account: memberAccount() });

      const response = await request(app).get('/v1/games/members/7/openings');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ white: [], black: [] });
    });

    it('should respond with not found for a member without an account or a malformed number', async () => {
      await createMember({ number: 8 });

      const withoutAccount = await request(app).get('/v1/games/members/8/openings');
      const malformed = await request(app).get('/v1/games/members/abc/openings');

      expect(withoutAccount.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should report an unexpected failure', async () => {
      await createMember({ number: 7, account: memberAccount() });
      vi.spyOn(PlayerModel, 'find').mockImplementationOnce(() => {
        throw new Error('boom');
      });

      const response = await request(app).get('/v1/games/members/7/openings');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/games/head-to-head/:first/:second', () => {
    async function linkedPlayers(): Promise<[string, string]> {
      const first = await createMember({
        number: 7,
        account: memberAccount({ clerkUserId: 'user_first' }),
      });
      const second = await createMember({
        number: 8,
        firstName: 'John',
        account: memberAccount({ clerkUserId: 'user_second' }),
      });
      return [
        await createPlayer({ lastName: 'First', memberId: first._id.toString() }),
        await createPlayer({ lastName: 'Second', memberId: second._id.toString() }),
      ];
    }

    const game = (
      round: number,
      opponentRank: number,
      scores: number[],
      color: RoundResult['color'],
    ): RoundResult => ({
      round,
      outcome: 'game',
      scores,
      points: scores.reduce((total, score) => total + score, 0),
      opponentRank,
      color,
    });

    it("should count each crosstable pairing as a game from the first member's side, linked to its archived copy", async () => {
      const [first, second] = await linkedPlayers();
      const other = await createPlayer({ lastName: 'Other' });
      const archived = await createGame(first, second, {
        year: 2023,
        date: '2023-09-21',
        round: '2',
      });
      await createTournament([
        section([
          entry(1, first, [
            game(1, 3, [1], 'black'),
            game(2, 2, [1], 'white'),
            { ...game(3, 2, [], null), outcome: 'forfeit' },
          ]),
          entry(2, second, [game(2, 1, [0], 'black')]),
          entry(3, other, [game(1, 1, [0], 'white')]),
        ]),
      ]);

      const response = await request(app).get('/v1/games/head-to-head/7/8');

      expect(response.status).toBe(200);
      const games: HeadToHeadGame[] = response.body.data;
      expect(games).toEqual([
        {
          tournamentNumber: 5,
          tournament: 'Club Championship 2023',
          section: 'Open',
          date: '2023-09-21',
          round: '2',
          color: 'white',
          score: 1,
          gameId: archived,
        },
      ]);
    });

    it('should split a double round into its two games, each with its own colour', async () => {
      const [first, second] = await linkedPlayers();
      const opening = await createGame(first, second, { year: 2023, round: '1' });
      const returnGame = await createGame(second, first, {
        year: 2023,
        round: '4',
        result: '1/2-1/2',
      });
      await createTournament([
        section(
          [
            entry(1, first, [game(1, 2, [1, 0.5], 'white')]),
            entry(2, second, [game(1, 1, [0, 0.5], 'black')]),
          ],
          { isDoubleRound: true },
        ),
      ]);

      const response = await request(app).get('/v1/games/head-to-head/7/8');

      const games: HeadToHeadGame[] = response.body.data;
      expect(games.map(({ color, score, gameId }) => ({ color, score, gameId }))).toEqual(
        expect.arrayContaining([
          { color: 'white', score: 1, gameId: opening },
          { color: 'black', score: 0.5, gameId: returnGame },
        ]),
      );
      expect(games).toHaveLength(2);
    });

    it("should add the archive's other games from the first member's side, newest first, leaving out those without a result", async () => {
      const [first, second] = await linkedPlayers();
      const older = await createGame(second, first, { date: '1994-03-05' });
      const newer = await createGame(first, second, {
        date: '1996',
        year: 1996,
        result: '1/2-1/2',
      });
      await createGame(first, second, { result: '*' });
      await createGame(first, await createPlayer({ lastName: 'Other' }));

      const response = await request(app).get('/v1/games/head-to-head/7/8');

      const games: HeadToHeadGame[] = response.body.data;
      expect(games).toEqual([
        {
          tournamentNumber: null,
          tournament: 'Club Championship',
          section: 'A',
          date: '1996',
          round: '1',
          color: 'white',
          score: 0.5,
          gameId: newer,
        },
        {
          tournamentNumber: null,
          tournament: 'Club Championship',
          section: 'A',
          date: '1994-03-05',
          round: '1',
          color: 'black',
          score: 0,
          gameId: older,
        },
      ]);
    });

    it('should name the recorded tournament of an archived game its crosstable does not pair', async () => {
      const [first, second] = await linkedPlayers();
      const archived = await createGame(first, second, { year: 2023 });
      await createTournament([
        section([entry(1, first, []), entry(2, second, [])], { name: 'Final' }),
      ]);

      const response = await request(app).get('/v1/games/head-to-head/7/8');

      const games: HeadToHeadGame[] = response.body.data;
      expect(games).toEqual([
        expect.objectContaining({
          tournamentNumber: 5,
          tournament: 'Club Championship 2023',
          section: 'Final',
          gameId: archived,
        }),
      ]);
    });

    it('should have no games for a member without archived players', async () => {
      await createMember({
        number: 7,
        account: memberAccount({ clerkUserId: 'user_a' }),
      });
      await createMember({
        number: 8,
        account: memberAccount({ clerkUserId: 'user_b' }),
      });

      const response = await request(app).get('/v1/games/head-to-head/7/8');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should turn away the same member on both sides', async () => {
      await createMember({ number: 7, account: memberAccount() });

      const response = await request(app).get('/v1/games/head-to-head/7/07');

      expect(response.status).toBe(400);
    });

    it('should respond with not found for a member without an account or a malformed number', async () => {
      await createMember({ number: 7, account: memberAccount() });
      await createMember({ number: 8, email: 'other@example.com' });

      const withoutAccount = await request(app).get('/v1/games/head-to-head/7/8');
      const malformed = await request(app).get('/v1/games/head-to-head/abc/7');

      expect(withoutAccount.status).toBe(404);
      expect(withoutAccount.body.message).toContain('[8]');
      expect(malformed.status).toBe(404);
    });

    it('should report an unexpected failure', async () => {
      await linkedPlayers();
      vi.spyOn(TournamentModel, 'find').mockImplementationOnce(() => {
        throw new Error('boom');
      });

      const response = await request(app).get('/v1/games/head-to-head/7/8');

      expect(response.status).toBe(500);
    });
  });
});
