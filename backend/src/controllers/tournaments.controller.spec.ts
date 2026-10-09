import request from 'supertest';

import { app } from '../app';
import { GameModel } from '../models/game.model';
import { PlayerModel } from '../models/player.model';
import {
  EntryInput,
  GameInput,
  MemberTournamentResult,
  PlayerNameMatch,
  RoundResult,
  SectionInput,
  Tournament,
  TournamentEntry,
  TournamentInput,
  TournamentModel,
  TournamentRecord,
  TournamentRegistrant,
  TournamentResponse,
  TournamentSummary,
} from '../models/tournament.model';
import { bearer } from '../testing/clerk.mock';
import { useTestDatabase } from '../testing/database';
import {
  MODIFICATION_INFO,
  createAccountHolder,
  createAdmin,
  createMember,
  memberAccount,
} from '../testing/fixtures';

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

const ADMIN = 'user_admin';
const MEMBER = 'user_member';

function inputEntry(
  rank: number,
  name: string,
  rating: number | null,
  rounds: RoundResult[] = [],
): EntryInput {
  return {
    rank,
    name,
    playerId: null,
    rating,
    provisionalGames: null,
    score: rounds.reduce((total, { points }) => total + points, 0),
    tiebreak: null,
    rounds,
  };
}

function inputSection(overrides: Partial<SectionInput> = {}): SectionInput {
  return {
    name: 'A',
    ratingBand: 'Open',
    roundCount: 1,
    isDoubleRound: false,
    entries: [
      inputEntry(1, 'Doe, Jane', 1600, [played(1, 2, 1)]),
      inputEntry(2, 'Roe, Rick', 1400, [played(1, 1, 0)]),
    ],
    ...overrides,
  };
}

function tournamentInput(overrides: Partial<TournamentInput> = {}): TournamentInput {
  return {
    name: 'Fall Rapid',
    subtitle: '',
    date: '2026-10-15',
    endDate: '2026-10-29',
    format: 'swiss',
    timeControl: 'G25+5',
    isRated: true,
    articleId: null,
    registrationOpens: '2026-10-01T12:00:00.000Z',
    registrationCloses: '2026-10-15T21:00:00.000Z',
    sections: null,
    games: null,
    modificationInfo: MODIFICATION_INFO,
    ...overrides,
  };
}

async function readTournament(number: number): Promise<TournamentRecord> {
  const record = await TournamentModel.findOne({ number }).lean<TournamentRecord>();
  if (!record) {
    throw new Error(`Tournament ${number} was not saved.`);
  }
  return record;
}

describe('tournaments routes', () => {
  useTestDatabase();

  function freezeTime(iso: string): void {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(iso));
  }

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
      expect(summaries[1]).toMatchObject({ articleId: null, playerCount: 3 });
    });

    it("should describe each section's shape, counting its archived games", async () => {
      const ann = await createPlayer('Ann');
      const bob = await createPlayer('Bob');
      await createGame(ann, bob, 'A1', '1');
      await createGame(bob, ann, 'A1 Playoff', '2');
      await createGame(ann, bob, 'B1', '1');
      await createTournament({
        gameArchiveTournament: 'Club Championship',
        sections: [
          {
            name: 'A1',
            ratingBand: 'U1800',
            roundCount: 1,
            isDoubleRound: false,
            gameArchiveSections: ['A1', 'A1 Playoff'],
            entries: [entry(1, ann, [played(1, 2, 1)]), entry(2, bob, [played(1, 1, 0)])],
          },
          {
            name: 'B1',
            ratingBand: '',
            roundCount: 3,
            isDoubleRound: false,
            gameArchiveSections: [],
            entries: [entry(1, ann)],
          },
        ],
      });

      const response = await request(app).get('/v1/tournaments');

      const [summary]: TournamentSummary[] = response.body.data;
      expect(summary.sections).toEqual([
        {
          name: 'A1',
          ratingBand: 'U1800',
          roundCount: 1,
          entryCount: 2,
          hasRounds: true,
          gameCount: 2,
        },
        {
          name: 'B1',
          ratingBand: '',
          roundCount: 3,
          entryCount: 1,
          hasRounds: false,
          gameCount: 0,
        },
      ]);
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

  describe('registration details', () => {
    it('should summarise the registration window and name the registrants', async () => {
      const member = await createMember({
        number: 5,
        firstName: 'Early',
        rating: '1700',
      });
      await createTournament({ number: 1 });
      await TournamentModel.create({
        number: 2,
        name: 'Fall Rapid',
        date: '2026-10-15',
        format: 'swiss',
        registrationOpens: '2026-10-01T12:00:00.000Z',
        registrationCloses: '2026-10-15T21:00:00.000Z',
        registrations: [
          { memberId: 'removed-member', registeredAt: '2026-10-02T12:00:00.000Z' },
          { memberId: member._id.toString(), registeredAt: '2026-10-03T12:00:00.000Z' },
        ],
      });

      const response = await request(app).get('/v1/tournaments');

      const summaries: TournamentSummary[] = response.body.data;
      expect(summaries.find(({ number }) => number === 2)).toMatchObject({
        registrationOpens: '2026-10-01T12:00:00.000Z',
        registrationCloses: '2026-10-15T21:00:00.000Z',
        registrants: [
          {
            memberNumber: 5,
            firstName: 'Early',
            lastName: member.lastName,
            rating: '1700',
            registeredAt: '2026-10-03T12:00:00.000Z',
          },
        ],
      });
      expect(summaries.find(({ number }) => number === 1)).toMatchObject({
        registrationOpens: null,
        registrationCloses: null,
        registrants: [],
      });
    });

    it('should name registrants in the order they registered, skipping removed members', async () => {
      const early = await createMember({ number: 5, firstName: 'Early', rating: '1700' });
      const late = await createMember({ number: 6, firstName: 'Late' });
      await TournamentModel.create({
        number: 2,
        name: 'Fall Rapid',
        date: '2026-10-15',
        format: 'swiss',
        registrations: [
          { memberId: late._id.toString(), registeredAt: '2026-10-03T12:00:00.000Z' },
          { memberId: 'removed-member', registeredAt: '2026-10-02T00:00:00.000Z' },
          { memberId: early._id.toString(), registeredAt: '2026-10-02T12:00:00.000Z' },
        ],
      });

      const response = await request(app).get('/v1/tournaments/2');

      const tournament: TournamentResponse = response.body.data;
      expect(tournament).not.toHaveProperty('registrations');
      expect(tournament.registrants).toEqual<TournamentRegistrant[]>([
        {
          memberNumber: 5,
          firstName: 'Early',
          lastName: 'Doe',
          rating: '1700',
          registeredAt: '2026-10-02T12:00:00.000Z',
        },
        {
          memberNumber: 6,
          firstName: 'Late',
          lastName: 'Doe',
          rating: '1500',
          registeredAt: '2026-10-03T12:00:00.000Z',
        },
      ]);
    });

    it('should report no registration details for a tournament recorded before them', async () => {
      await TournamentModel.collection.insertOne({
        number: 9,
        name: 'Old Blitz',
        date: '2019-07-04',
        format: 'swiss',
        sections: [],
      });

      const response = await request(app).get('/v1/tournaments/9');

      expect(response.body.data).toMatchObject({
        registrationOpens: null,
        registrationCloses: null,
        modificationInfo: null,
        registrants: [],
      });
    });
  });

  describe('POST /v1/tournaments', () => {
    it('should number an upcoming tournament after the highest stored and credit the admin', async () => {
      await createAdmin(ADMIN);
      await createTournament({ number: 182 });

      const response = await request(app)
        .post('/v1/tournaments')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput({ name: '  Fall Rapid  ' }));

      expect(response.status).toBe(201);
      expect(response.body.data).toBe(183);
      const saved = await readTournament(183);
      expect(saved).toMatchObject({
        name: 'Fall Rapid',
        date: '2026-10-15',
        endDate: '2026-10-29',
        registrationOpens: '2026-10-01T12:00:00.000Z',
        registrationCloses: '2026-10-15T21:00:00.000Z',
        registrations: [],
        sections: [],
        gameArchiveTournament: null,
      });
      expect(saved.modificationInfo?.createdBy).toBe('Ada Admin');
    });

    it('should never hand out the number of a deleted tournament again', async () => {
      await createAdmin(ADMIN);
      const first = await request(app)
        .post('/v1/tournaments')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput());
      await request(app)
        .delete(`/v1/tournaments/${first.body.data}`)
        .set('Authorization', bearer(ADMIN));

      const second = await request(app)
        .post('/v1/tournaments')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput());

      expect(first.body.data).toBe(1);
      expect(second.body.data).toBe(2);
    });

    it('should store imported results against archive players and rate the performances', async () => {
      await createAdmin(ADMIN);
      const member = await createMember({
        firstName: 'Rick',
        lastName: 'Roe',
        number: 12,
      });
      const existing = await PlayerModel.create({ firstName: 'Jane', lastName: 'Doe' });

      const response = await request(app)
        .post('/v1/tournaments')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput({ sections: [inputSection()] }));

      expect(response.status).toBe(201);
      const [section] = (await readTournament(response.body.data)).sections;
      const created = await PlayerModel.findOne({ lastName: 'Roe' }).lean();
      expect(section).toMatchObject({
        name: 'A',
        ratingBand: 'Open',
        roundCount: 1,
        gameArchiveSections: [],
      });
      expect(section.entries.map(({ playerId }) => playerId)).toEqual([
        existing._id.toString(),
        created?._id.toString(),
      ]);
      expect(created?.memberId).toBe(member._id.toString());
      expect(section.entries.map(({ performanceRating }) => performanceRating)).toEqual([
        1800, 1200,
      ]);
    });

    it('should reject a tournament the site cannot store', async () => {
      await createAdmin(ADMIN);
      const invalid: object[] = [
        tournamentInput({ name: ' ' }),
        tournamentInput({ date: '2026-02-30' }),
        tournamentInput({ endDate: '2026-10-01' }),
        tournamentInput({ registrationCloses: '2026-09-01T00:00:00.000Z' }),
        tournamentInput({ registrationOpens: null }),
        tournamentInput({
          sections: [
            inputSection({
              entries: [inputEntry(1, 'Doe, Jane', 1600, [played(1, 7, 1)])],
            }),
          ],
        }),
      ];

      const responses = await Promise.all(
        invalid.map(body =>
          request(app)
            .post('/v1/tournaments')
            .set('Authorization', bearer(ADMIN))
            .send(body),
        ),
      );

      expect(responses.map(({ status }) => status)).toEqual(invalid.map(() => 400));
      expect(responses[5].body.message).toBe(
        'Unable to save the tournament because section A, rank 1, a round names an opponent who is not in the section.',
      );
      expect(await TournamentModel.countDocuments()).toBe(0);
    });

    it('should only let admins add tournaments', async () => {
      await createAccountHolder({ clerkUserId: MEMBER });

      const anonymous = await request(app)
        .post('/v1/tournaments')
        .send(tournamentInput());
      const member = await request(app)
        .post('/v1/tournaments')
        .set('Authorization', bearer(MEMBER))
        .send(tournamentInput());

      expect(anonymous.status).toBe(401);
      expect(member.status).toBe(403);
    });

    it('should respond with a server error when the tournament cannot be saved', async () => {
      await createAdmin(ADMIN);
      vi.spyOn(TournamentModel, 'create').mockRejectedValue(new Error('down'));

      const response = await request(app)
        .post('/v1/tournaments')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput());

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /v1/tournaments/:number', () => {
    it('should update the details and keep the recorded results and registrations', async () => {
      await createAdmin(ADMIN);
      const registration = { memberId: 'm1', registeredAt: '2026-10-02T12:00:00.000Z' };
      await createTournament({
        sections: [
          {
            name: '',
            ratingBand: '',
            roundCount: 1,
            isDoubleRound: false,
            gameArchiveSections: [],
            entries: [entry(1, 'p1')],
          },
        ],
        registrations: [registration],
      });

      const response = await request(app)
        .put('/v1/tournaments/86')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput({ name: 'Club Championship', date: '2023-09-14' }));

      expect(response.status).toBe(200);
      const saved = await readTournament(86);
      expect(saved.name).toBe('Club Championship');
      expect(saved.sections[0].entries[0].playerId).toBe('p1');
      expect(saved.registrations).toEqual([registration]);
      expect(saved.modificationInfo).toMatchObject({
        createdBy: 'Ada Admin',
        lastEditedBy: 'Ada Admin',
      });
    });

    it('should replace the results, keep archive sections and drop players only they named', async () => {
      await createAdmin(ADMIN);
      const typo = await PlayerModel.create({ firstName: 'Jnae', lastName: 'Doe' });
      const archived = await PlayerModel.create({
        firstName: 'Old',
        lastName: 'Timer',
        gameCount: 3,
      });
      await createTournament({
        modificationInfo: MODIFICATION_INFO,
        sections: [
          {
            name: 'A',
            ratingBand: '',
            roundCount: 1,
            isDoubleRound: false,
            gameArchiveSections: ['A1'],
            entries: [entry(1, typo._id.toString()), entry(2, archived._id.toString())],
          },
        ],
      });

      const response = await request(app)
        .put('/v1/tournaments/86')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput({ sections: [inputSection()] }));

      expect(response.status).toBe(200);
      const saved = await readTournament(86);
      expect(saved.sections[0].gameArchiveSections).toEqual(['A1']);
      expect(saved.modificationInfo?.createdBy).toBe('Someone Else');
      expect(await PlayerModel.exists({ _id: typo._id })).toBeNull();
      expect(await PlayerModel.exists({ _id: archived._id })).not.toBeNull();
    });

    it('should respond with not found for an unknown or malformed number', async () => {
      await createAdmin(ADMIN);

      const unknown = await request(app)
        .put('/v1/tournaments/404')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput());
      const malformed = await request(app)
        .put('/v1/tournaments/abc')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput());

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should reject invalid details', async () => {
      await createAdmin(ADMIN);
      await createTournament();

      const response = await request(app)
        .put('/v1/tournaments/86')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput({ format: 'knockout' as Tournament['format'] }));

      expect(response.status).toBe(400);
    });

    it('should respond with a server error when the database fails', async () => {
      await createAdmin(ADMIN);
      await createTournament();
      vi.spyOn(TournamentModel, 'updateOne').mockRejectedValue(new Error('down'));

      const response = await request(app)
        .put('/v1/tournaments/86')
        .set('Authorization', bearer(ADMIN))
        .send(tournamentInput());

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /v1/tournaments/:number', () => {
    it('should delete the tournament and the players only it named', async () => {
      await createAdmin(ADMIN);
      const only = await PlayerModel.create({ firstName: 'Only', lastName: 'Here' });
      const shared = await PlayerModel.create({
        firstName: 'Also',
        lastName: 'Elsewhere',
      });
      await createTournament({
        sections: [
          {
            name: '',
            ratingBand: '',
            roundCount: 0,
            isDoubleRound: false,
            gameArchiveSections: [],
            entries: [entry(1, only._id.toString()), entry(2, shared._id.toString())],
          },
        ],
      });
      await createTournament({
        number: 87,
        sections: [
          {
            name: '',
            ratingBand: '',
            roundCount: 0,
            isDoubleRound: false,
            gameArchiveSections: [],
            entries: [entry(1, shared._id.toString())],
          },
        ],
      });

      const response = await request(app)
        .delete('/v1/tournaments/86')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(200);
      expect(await TournamentModel.exists({ number: 86 })).toBeNull();
      expect(await PlayerModel.exists({ _id: only._id })).toBeNull();
      expect(await PlayerModel.exists({ _id: shared._id })).not.toBeNull();
    });

    it('should respond with not found for an unknown or malformed number', async () => {
      await createAdmin(ADMIN);

      const unknown = await request(app)
        .delete('/v1/tournaments/404')
        .set('Authorization', bearer(ADMIN));
      const malformed = await request(app)
        .delete('/v1/tournaments/abc')
        .set('Authorization', bearer(ADMIN));

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      await createAdmin(ADMIN);
      vi.spyOn(TournamentModel, 'findOneAndDelete').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app)
        .delete('/v1/tournaments/86')
        .set('Authorization', bearer(ADMIN));

      expect(response.status).toBe(500);
    });
  });

  describe('POST /v1/tournaments/player-matches', () => {
    it('should say which names the archive knows and which members they belong to', async () => {
      await createAdmin(ADMIN);
      const member = await createMember({ firstName: 'Zoë', lastName: 'Yu', number: 31 });
      const linked = await PlayerModel.create({
        firstName: 'Zoe',
        lastName: 'Yu',
        memberId: member._id.toString(),
      });
      await createMember({ firstName: 'New', lastName: 'Member', number: 32 });

      const response = await request(app)
        .post('/v1/tournaments/player-matches')
        .set('Authorization', bearer(ADMIN))
        .send({
          names: ['Yu, Zoe', ' yu,  zoë ', 'Member, New', 'Stranger, Sam', 'Yu, Zoe'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual<PlayerNameMatch[]>([
        { name: 'Yu, Zoe', playerId: linked._id.toString(), memberNumber: 31 },
        { name: 'yu,  zoë', playerId: linked._id.toString(), memberNumber: 31 },
        { name: 'Member, New', playerId: null, memberNumber: 32 },
        { name: 'Stranger, Sam', playerId: null, memberNumber: null },
      ]);
    });

    it('should reject anything but a list of names', async () => {
      await createAdmin(ADMIN);

      const responses = await Promise.all(
        [{}, { names: 'Doe, Jane' }, { names: ['Doe, Jane', ' '] }].map(body =>
          request(app)
            .post('/v1/tournaments/player-matches')
            .set('Authorization', bearer(ADMIN))
            .send(body),
        ),
      );

      expect(responses.map(({ status }) => status)).toEqual([400, 400, 400]);
    });

    it('should respond with a server error when the database fails', async () => {
      await createAdmin(ADMIN);
      vi.spyOn(PlayerModel, 'find').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app)
        .post('/v1/tournaments/player-matches')
        .set('Authorization', bearer(ADMIN))
        .send({ names: ['Doe, Jane'] });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /v1/tournaments/:number/registration', () => {
    async function createOpenTournament(): Promise<void> {
      await createTournament({
        number: 2,
        date: '2026-10-15',
        registrationOpens: '2026-10-01T12:00:00.000Z',
        registrationCloses: '2026-10-15T21:00:00.000Z',
      });
    }

    it('should register the member once while registration is open', async () => {
      freezeTime('2026-10-05T12:00:00.000Z');
      await createAccountHolder(
        { clerkUserId: MEMBER },
        { number: 44, firstName: 'Reg', lastName: 'Istrant' },
      );
      await createOpenTournament();

      const first = await request(app)
        .post('/v1/tournaments/2/registration')
        .set('Authorization', bearer(MEMBER));
      const again = await request(app)
        .post('/v1/tournaments/2/registration')
        .set('Authorization', bearer(MEMBER));

      expect(first.status).toBe(200);
      expect(again.status).toBe(200);
      expect(again.body.data).toEqual<TournamentRegistrant[]>([
        {
          memberNumber: 44,
          firstName: 'Reg',
          lastName: 'Istrant',
          rating: '1500',
          registeredAt: '2026-10-05T12:00:00.000Z',
        },
      ]);
      expect((await readTournament(2)).registrations).toHaveLength(1);
    });

    it('should refuse registration outside the window', async () => {
      await createAccountHolder({ clerkUserId: MEMBER });
      await createOpenTournament();
      await createTournament({ number: 3 });

      freezeTime('2026-09-30T12:00:00.000Z');
      const early = await request(app)
        .post('/v1/tournaments/2/registration')
        .set('Authorization', bearer(MEMBER));
      freezeTime('2026-10-15T21:00:00.000Z');
      const late = await request(app)
        .post('/v1/tournaments/2/registration')
        .set('Authorization', bearer(MEMBER));
      const offline = await request(app)
        .post('/v1/tournaments/3/registration')
        .set('Authorization', bearer(MEMBER));

      expect([early.status, late.status, offline.status]).toEqual([409, 409, 409]);
      expect(early.body.message).toBe(
        'Registration for this tournament has not opened yet.',
      );
      expect(late.body.message).toBe('Registration for this tournament has closed.');
      expect(offline.body.message).toBe(
        'This tournament does not take registrations online.',
      );
      expect((await readTournament(2)).registrations).toEqual([]);
    });

    it('should only register signed-in members of an existing tournament', async () => {
      freezeTime('2026-10-05T12:00:00.000Z');
      await createOpenTournament();

      const anonymous = await request(app).post('/v1/tournaments/2/registration');
      const stranger = await request(app)
        .post('/v1/tournaments/2/registration')
        .set('Authorization', bearer('user_stranger'));
      const unknown = await request(app)
        .post('/v1/tournaments/404/registration')
        .set('Authorization', bearer('user_stranger'));
      const malformed = await request(app)
        .post('/v1/tournaments/abc/registration')
        .set('Authorization', bearer('user_stranger'));

      expect(anonymous.status).toBe(401);
      expect(stranger.status).toBe(403);
      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      await createAccountHolder({ clerkUserId: MEMBER });
      await createOpenTournament();
      vi.spyOn(TournamentModel, 'updateOne').mockRejectedValue(new Error('down'));

      const response = await request(app)
        .post('/v1/tournaments/2/registration')
        .set('Authorization', bearer(MEMBER));

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /v1/tournaments/:number/registration', () => {
    async function createRegisteredTournament(
      memberId: string,
      overrides: Partial<Omit<Tournament, 'id'>> = {},
    ): Promise<void> {
      await createTournament({
        number: 2,
        date: '2026-10-15',
        registrationOpens: '2026-10-01T12:00:00.000Z',
        registrationCloses: '2026-10-10T21:00:00.000Z',
        registrations: [
          { memberId, registeredAt: '2026-10-02T12:00:00.000Z' },
          { memberId: 'other', registeredAt: '2026-10-03T12:00:00.000Z' },
        ],
        ...overrides,
      });
    }

    it('should withdraw the member up to the day the tournament starts', async () => {
      const member = await createAccountHolder({ clerkUserId: MEMBER });
      await createRegisteredTournament(member._id.toString());
      // Late evening in Toronto is already the next day in UTC
      freezeTime('2026-10-16T02:00:00.000Z');

      const response = await request(app)
        .delete('/v1/tournaments/2/registration')
        .set('Authorization', bearer(MEMBER));

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect((await readTournament(2)).registrations).toEqual([
        { memberId: 'other', registeredAt: '2026-10-03T12:00:00.000Z' },
      ]);
    });

    it('should keep registrations once the tournament has started or has results', async () => {
      const member = await createAccountHolder({ clerkUserId: MEMBER });
      await createRegisteredTournament(member._id.toString());
      await createTournament({
        number: 3,
        date: '2026-12-01',
        sections: [
          {
            name: '',
            ratingBand: '',
            roundCount: 0,
            isDoubleRound: false,
            gameArchiveSections: [],
            entries: [entry(1, 'p1')],
          },
        ],
      });
      freezeTime('2026-10-16T12:00:00.000Z');

      const started = await request(app)
        .delete('/v1/tournaments/2/registration')
        .set('Authorization', bearer(MEMBER));
      const withResults = await request(app)
        .delete('/v1/tournaments/3/registration')
        .set('Authorization', bearer(MEMBER));

      expect(started.status).toBe(409);
      expect(withResults.status).toBe(409);
      expect((await readTournament(2)).registrations).toHaveLength(2);
    });

    it('should only withdraw signed-in members from an existing tournament', async () => {
      await createRegisteredTournament('someone');

      const stranger = await request(app)
        .delete('/v1/tournaments/2/registration')
        .set('Authorization', bearer('user_stranger'));
      const unknown = await request(app)
        .delete('/v1/tournaments/404/registration')
        .set('Authorization', bearer('user_stranger'));

      expect(stranger.status).toBe(403);
      expect(unknown.status).toBe(404);
    });

    it('should respond with a server error when the database fails', async () => {
      await createAccountHolder({ clerkUserId: MEMBER });
      vi.spyOn(TournamentModel, 'findOne').mockImplementation(() => {
        throw new Error('down');
      });

      const response = await request(app)
        .delete('/v1/tournaments/2/registration')
        .set('Authorization', bearer(MEMBER));

      expect(response.status).toBe(500);
    });
  });

  describe('games from a pgn', () => {
    const recordedSection = (white: string, black: string) => ({
      name: 'A1',
      ratingBand: '',
      roundCount: 2,
      isDoubleRound: false,
      gameArchiveSections: [],
      entries: [
        {
          ...entry(1, white, [played(1, 2, 1)]),
          performanceRating: 1900,
          resultNote: '',
        },
        {
          ...entry(2, black, [played(1, 1, 0)]),
          performanceRating: 1100,
          resultNote: '',
        },
      ],
    });

    const sectionInput = (white: string, black: string, rounds = 1): SectionInput => ({
      name: 'A1',
      ratingBand: '',
      roundCount: 2,
      isDoubleRound: false,
      entries: [
        {
          ...inputEntry(1, 'White, Pat', 1500, [played(1, 2, 1)]),
          playerId: white,
        },
        {
          ...inputEntry(2, 'Black, Pat', 1500, [played(1, 1, 0)]),
          playerId: black,
        },
      ].map(input => ({
        ...input,
        rounds: input.rounds.slice(0, rounds),
        score: input.rounds
          .slice(0, rounds)
          .reduce((total, { points }) => total + points, 0),
      })),
    });

    const gameInput = (white: string, black: string, overrides = {}): GameInput => ({
      section: 'A1',
      round: '1',
      date: '2023-09-14',
      whitePlayerId: white,
      blackPlayerId: black,
      result: '1-0',
      whiteElo: 1500,
      blackElo: 1500,
      eco: 'C20',
      plyCount: 3,
      moves: '1. e4 e5 2. Qh5 1-0',
      ...overrides,
    });

    let white: string;
    let black: string;

    beforeEach(async () => {
      await createAdmin(ADMIN);
      white = await createPlayer('White');
      black = await createPlayer('Black');
      await createTournament({ sections: [recordedSection(white, black)] });
    });

    it('should report which sections and games an import would change', async () => {
      await GameModel.create({
        ...gameInput(white, black),
        tournament: 'Championship',
        year: 2023,
        modificationInfo: MODIFICATION_INFO,
      });

      const response = await request(app)
        .post('/v1/tournaments/86/import-changes')
        .set('Authorization', bearer(ADMIN))
        .send({
          sections: [
            sectionInput(white, black),
            { ...sectionInput(white, black), name: 'B' },
          ],
          games: [
            gameInput(white, black),
            gameInput(white, black, { moves: '1. e4 e5 2. Qh5 Nc6 1-0', plyCount: 4 }),
            gameInput(white, black, { round: '2' }),
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        sectionChanges: [false, true],
        removedSections: [],
        games: ['unchanged', 'changed', 'new'],
      });
    });

    it('should name the recorded sections an import leaves out', async () => {
      const response = await request(app)
        .post('/v1/tournaments/86/import-changes')
        .set('Authorization', bearer(ADMIN))
        .send({ sections: [{ ...sectionInput(white, black), name: 'B' }], games: [] });

      expect(response.body.data.removedSections).toEqual(['A1']);
    });

    it('should refuse to check an unknown tournament or an unreadable import', async () => {
      const missing = await request(app)
        .post('/v1/tournaments/99/import-changes')
        .set('Authorization', bearer(ADMIN))
        .send({ sections: [], games: [] });
      const unreadable = await request(app)
        .post('/v1/tournaments/86/import-changes')
        .set('Authorization', bearer(ADMIN))
        .send({ sections: [], games: [gameInput(white, black, { result: 'win' })] });

      expect(missing.status).toBe(404);
      expect(unreadable.status).toBe(400);
      expect(unreadable.body.message).toBe(
        'Unable to check the import because game 1 has an unknown result.',
      );
    });

    it('should keep an unchanged section as recorded and add the new games once', async () => {
      const save = () =>
        request(app)
          .put('/v1/tournaments/86')
          .set('Authorization', bearer(ADMIN))
          .send(
            tournamentInput({
              format: 'round-robin',
              sections: [sectionInput(white, black)],
              games: [gameInput(white, black)],
            }),
          );

      const first = await save();
      await save();

      expect(first.status).toBe(200);
      const saved = await readTournament(86);
      expect(saved.sections[0].entries[0].performanceRating).toBe(1900);
      expect(saved.sections[0].gameArchiveSections).toEqual(['A1']);
      expect(saved.gameArchiveTournament).toBe('Fall Rapid');
      const games = await GameModel.find({ tournament: 'Fall Rapid' }).lean();
      expect(games).toHaveLength(1);
      expect(games[0].opening).not.toBe('');
      const counted = await PlayerModel.findById(white).lean();
      expect(counted?.gameCount).toBe(1);
    });

    it('should rewrite a game the archive holds differently, without counting it again', async () => {
      await TournamentModel.updateOne(
        { number: 86 },
        { $set: { gameArchiveTournament: 'Club Championship' } },
      );
      const gameId = await createGame(white, black, 'A1', '1');

      const response = await request(app)
        .put('/v1/tournaments/86')
        .set('Authorization', bearer(ADMIN))
        .send(
          tournamentInput({
            sections: [sectionInput(white, black)],
            games: [
              gameInput(white, black, {
                result: '1/2-1/2',
                moves: '1. e4 1/2-1/2',
                plyCount: 1,
              }),
            ],
          }),
        );

      expect(response.status).toBe(200);
      const game = await GameModel.findById(gameId).lean();
      expect(game).toMatchObject({ result: '1/2-1/2', plyCount: 1 });
      expect(game?.modificationInfo.lastEditedBy).toBe('Ada Admin');
      const player = await PlayerModel.findById(white).lean();
      expect(player?.gameCount).toBe(0);
    });

    it('should refuse games for a tournament not yet saved, or for unknown players', async () => {
      const adding = await request(app)
        .post('/v1/tournaments')
        .set('Authorization', bearer(ADMIN))
        .send(
          tournamentInput({
            sections: [sectionInput(white, black)],
            games: [gameInput(white, black)],
          }),
        );
      const unknown = await request(app)
        .put('/v1/tournaments/86')
        .set('Authorization', bearer(ADMIN))
        .send(
          tournamentInput({
            sections: [sectionInput(white, black)],
            games: [gameInput(white, '6a7f6f69f983bd7b3881d3e6')],
          }),
        );

      expect(adding.status).toBe(400);
      expect(unknown.status).toBe(400);
      expect(unknown.body.message).toBe(
        'Unable to save the tournament because it names a player the archive does not hold.',
      );
    });
  });
});
