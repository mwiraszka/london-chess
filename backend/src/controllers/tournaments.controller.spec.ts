import request from 'supertest';

import { app } from '../app';
import { GameModel } from '../models/game.model';
import { PlayerModel } from '../models/player.model';
import {
  MemberTournamentResult,
  RoundResult,
  Tournament,
  TournamentEntry,
  TournamentModel,
  TournamentResponse,
  TournamentSummary,
} from '../models/tournament.model';
import { useTestDatabase } from '../testing/database';
import { MODIFICATION_INFO, createMember, memberAccount } from '../testing/fixtures';

vi.mock('@clerk/backend', () => import('../testing/clerk.mock.js'));
vi.mock('../services/clerk.service', () => import('../testing/clerk.mock.js'));

const played = (round: number, opponentRank: number, points: number): RoundResult => ({
  round,
  outcome: 'game',
  scores: [points],
  points,
  opponentRank,
  color: null,
});

function entry(
  rank: number,
  playerId: string,
  rounds: RoundResult[] = [],
): TournamentEntry {
  return {
    rank,
    playerId,
    rating: 1500,
    provisionalGames: null,
    performanceRating: null,
    score: rounds.reduce((total, { points }) => total + points, 0),
    tiebreak: null,
    rounds,
    resultNote: '',
  };
}

async function createTournament(
  overrides: Partial<Omit<Tournament, 'id'>> = {},
): Promise<void> {
  await TournamentModel.create({
    number: 86,
    name: 'Championship',
    date: '2023-09-14',
    format: 'round-robin',
    timeControl: 'G80',
    isRated: true,
    gameArchiveTournament: null,
    sections: [],
    ...overrides,
  });
}

async function createPlayer(lastName: string, memberId: string | null = null) {
  const player = await PlayerModel.create({ firstName: 'Pat', lastName, memberId });
  return player._id.toString();
}

async function createGame(
  white: string,
  black: string,
  section: string,
  round: string,
): Promise<string> {
  const game = await GameModel.create({
    tournament: 'Club Championship',
    section,
    year: 2023,
    date: '2023-09-14',
    round,
    whitePlayerId: white,
    blackPlayerId: black,
    result: '1-0',
    plyCount: 40,
    moves: '1. e4',
    modificationInfo: MODIFICATION_INFO,
  });
  return game._id.toString();
}

describe('tournaments routes', () => {
  useTestDatabase();

  describe('GET /v1/tournaments', () => {
    it('should summarise every tournament, newest first, counting each player once', async () => {
      await createTournament({
        number: 1,
        date: '2022-01-01',
        sections: [
          {
            name: 'A',
            ratingBand: '',
            roundCount: 5,
            isDoubleRound: false,
            gameArchiveSections: [],
            entries: [entry(1, 'p1'), entry(2, 'p2')],
          },
          {
            name: 'B',
            ratingBand: '',
            roundCount: 3,
            isDoubleRound: false,
            gameArchiveSections: [],
            entries: [entry(1, 'p2'), entry(2, 'p3')],
          },
        ],
      });
      await createTournament({ number: 2, date: '2023-01-01' });

      const response = await request(app).get('/v1/tournaments');

      expect(response.status).toBe(200);
      const summaries: TournamentSummary[] = response.body.data;
      expect(summaries.map(summary => summary.number)).toEqual([2, 1]);
      expect(summaries[1]).toMatchObject({
        sectionCount: 2,
        roundCount: 5,
        playerCount: 3,
      });
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(TournamentModel, 'aggregate').mockRejectedValue(new Error('down'));

      const response = await request(app).get('/v1/tournaments');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/tournaments/:number', () => {
    it('should return the crosstable with players named and results linked to their games', async () => {
      const ann = await createPlayer('Ann');
      const bob = await createPlayer('Bob');
      const cat = await createPlayer('Cat');
      const sectionAGame = await createGame(ann, bob, 'A1', '1');
      const playoffGame = await createGame(cat, ann, 'B1 Playoff', '2');
      const sectionBGame = await createGame(ann, cat, 'B1', '1');
      await createTournament({
        gameArchiveTournament: 'Club Championship',
        sections: [
          {
            name: 'A1',
            ratingBand: '',
            roundCount: 1,
            isDoubleRound: false,
            gameArchiveSections: ['A1'],
            entries: [entry(1, ann, [played(1, 2, 1)]), entry(2, bob, [played(1, 1, 0)])],
          },
          {
            name: 'B1',
            ratingBand: '',
            roundCount: 2,
            isDoubleRound: false,
            gameArchiveSections: ['B1', 'B1 Playoff'],
            entries: [entry(1, 'missing-player')],
          },
        ],
      });

      const response = await request(app).get('/v1/tournaments/86');

      expect(response.status).toBe(200);
      const tournament: TournamentResponse = response.body.data;
      const [sectionA, sectionB] = tournament.sections;
      expect(tournament).not.toHaveProperty('gameArchiveTournament');
      expect(sectionA).not.toHaveProperty('gameArchiveSections');
      expect(sectionA.entries[0].player.lastName).toBe('Ann');
      expect(sectionA.entries[0].rounds[0].gameId).toBe(sectionAGame);
      expect(sectionA.games.map(game => game.id)).toEqual([sectionAGame]);
      expect(sectionB.entries[0].player).toMatchObject({ lastName: 'Unknown' });
      expect(sectionB.games.map(game => game.id)).toEqual([sectionBGame, playoffGame]);
    });

    it('should have no games for a tournament that was never archived', async () => {
      const ann = await createPlayer('Ann');
      await createGame(ann, ann, 'A1', '1');
      await createTournament({
        sections: [
          {
            name: 'A1',
            ratingBand: '',
            roundCount: 1,
            isDoubleRound: false,
            gameArchiveSections: ['A1'],
            entries: [entry(1, ann)],
          },
        ],
      });

      const response = await request(app).get('/v1/tournaments/86');

      expect(response.body.data.sections[0].games).toEqual([]);
    });

    it('should respond with not found for an unknown or malformed number', async () => {
      const unknown = await request(app).get('/v1/tournaments/404');
      const malformed = await request(app).get('/v1/tournaments/abc');

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      vi.spyOn(TournamentModel, 'findOne').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get('/v1/tournaments/86');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /v1/tournaments/members/:number', () => {
    it("should list the member's results under every player linked to them", async () => {
      const member = await createMember({
        number: 7,
        account: memberAccount({ clerkUserId: 'user_member' }),
      });
      const linked = await createPlayer('Doe', member._id.toString());
      const other = await createPlayer('Other');
      await createTournament({
        number: 3,
        name: 'Rapid',
        sections: [
          {
            name: '',
            ratingBand: '',
            roundCount: 4,
            isDoubleRound: false,
            gameArchiveSections: [],
            entries: [entry(1, other), entry(2, linked)],
          },
        ],
      });

      const response = await request(app).get('/v1/tournaments/members/7');

      expect(response.status).toBe(200);
      const results: MemberTournamentResult[] = response.body.data;
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        tournament: { number: 3, name: 'Rapid' },
        rank: 2,
        playerCount: 2,
      });
    });

    it('should have no results for a member without archived players', async () => {
      await createMember({ number: 7, account: memberAccount() });

      const response = await request(app).get('/v1/tournaments/members/7');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should respond with not found for a member without an account or a malformed number', async () => {
      await createMember({ number: 8 });

      const withoutAccount = await request(app).get('/v1/tournaments/members/8');
      const malformed = await request(app).get('/v1/tournaments/members/abc');

      expect(withoutAccount.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      await createMember({ number: 7, account: memberAccount() });
      vi.spyOn(PlayerModel, 'find').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app).get('/v1/tournaments/members/7');

      expect(response.status).toBe(500);
    });
  });
});
