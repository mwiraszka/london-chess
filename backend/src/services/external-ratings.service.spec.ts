import { MemberModel, MemberRecord } from '../models/member.model';
import { useTestDatabase } from '../testing/database';
import { createMember, readMember } from '../testing/fixtures';
import {
  externalRatingsFreshFor,
  externalRatingsOf,
  hasUnlookedHandles,
  refreshExternalRatings,
} from './external-ratings.service';

const CHECKED_AT = '2026-10-30T12:00:00.000Z';
const HOUR_MS = 3600 * 1000;

const HANDLES = {
  chessComUsername: 'JaneDoe',
  lichessUsername: 'jane_doe',
  fideId: '2600123',
  cfcId: '150123',
};

const FIDE_PROFILE = 'https://ratings.fide.com/profile/2600123';

// Made fresh for each request, as a response body can only be read once
type Answers = Record<string, () => Response>;

const json =
  (body: unknown, status = 200): (() => Response) =>
  () =>
    new Response(JSON.stringify(body), { status });

const html = (body: string) => () => new Response(body);

// Shaped like the boxes and rank tables of a FIDE profile page
const fideGame = (className: string, rating: string) => `
  <div class="${className} profile-game ">
    <img src="/img/logo.svg" alt="" height=25>
    <p>${rating}</p><p style="font-size: 8px;">RATING <span class=inactiv_note></span></p>
  </div>`;

const fideRankBlock = (title: string, active: number, all: number) => `
  <div class="profile-rank-block">
    <h5>${title}</h5>
    <div class="profile-rank-row "><h6>Active players</h6><p>${active}</p></div>
    <div class="profile-rank-row "><h6>All players</h6><p>${all}</p></div>
  </div>
  <!--profile-rank-->`;

const fidePage = (ratings: [string, string, string], ranks = '') => `
  <div class="profile-games ">
    ${fideGame('profile-standart', ratings[0])}
    ${fideGame('profile-rapid', ratings[1])}
    ${fideGame('profile-blitz', ratings[2])}
  </div>
  <div class="profile-ranks">${ranks}</div>`;

const ANSWERS: Answers = {
  'https://api.chess.com/pub/player/janedoe/stats': json({
    chess_daily: { last: { rating: 1310 } },
    chess_rapid: { last: { rating: 1520 } },
    chess_blitz: { last: { rating: 1430 } },
    tactics: { highest: { rating: 2100 } },
  }),
  'https://lichess.org/api/user/jane_doe': json({
    perfs: {
      classical: { games: 40, rating: 1710 },
      rapid: { games: 12, rating: 1640, prov: true },
      blitz: { games: 230, rating: 1580 },
      bullet: { games: 0, rating: 1500, prov: true },
    },
  }),
  [FIDE_PROFILE]: html(
    fidePage(
      ['1745', '1690', 'Not rated'],
      fideRankBlock('World Rank', 0, 129807) +
        fideRankBlock('National Rank CAN', 812, 1096),
    ),
  ),
  'https://server.chess.ca/api/player/v1/150123': json({
    player: { name_last: 'Doe', regular_rating: 1802, quick_rating: 0 },
  }),
};

function answerWith(answers: Answers): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const answer = answers[String(input)];
    if (!answer) {
      throw new Error(`Unexpected request to ${String(input)}`);
    }
    return answer();
  });
}

async function memberWithHandles(
  overrides: Partial<Omit<MemberRecord, '_id'>> = {},
): Promise<MemberRecord> {
  return createMember({ ...HANDLES, ...overrides });
}

describe('external ratings service', () => {
  useTestDatabase();

  describe('refreshExternalRatings', () => {
    it("should save every site's rapid, blitz and bullet ratings, or a federation's own, under the handle they were looked up by", async () => {
      answerWith(ANSWERS);
      const member = await memberWithHandles();

      const refreshed = await refreshExternalRatings(member);

      const saved = await readMember(member._id);
      expect(refreshed.externalRatings).toEqual(saved.externalRatings);
      expect(saved.externalRatings?.lookups).toEqual({
        chessCom: {
          handle: 'JaneDoe',
          ratings: [
            { timeControl: 'rapid', rating: 1520, provisional: false },
            { timeControl: 'blitz', rating: 1430, provisional: false },
          ],
        },
        lichess: {
          handle: 'jane_doe',
          ratings: [
            { timeControl: 'rapid', rating: 1640, provisional: true },
            { timeControl: 'blitz', rating: 1580, provisional: false },
          ],
        },
        fide: {
          handle: '2600123',
          ratings: [
            { timeControl: 'standard', rating: 1745, provisional: false },
            { timeControl: 'rapid', rating: 1690, provisional: false },
          ],
          worldRank: { rank: 129807, amongActive: false },
        },
        cfc: {
          handle: '150123',
          ratings: [{ timeControl: 'regular', rating: 1802, provisional: false }],
        },
      });
      expect(saved.externalRatings?.checkedAt).toEqual(expect.any(String));
    });

    it('should ask Chess.com with a user agent, as it turns away requests without one', async () => {
      answerWith(ANSWERS);
      const member = await memberWithHandles({
        lichessUsername: '',
        fideId: '',
        cfcId: '',
      });

      await refreshExternalRatings(member);

      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect(new Headers(init?.headers).get('User-Agent')).toContain('London Chess Club');
    });

    it('should save no ratings for a player a site does not know, and none rated for an unrated one', async () => {
      answerWith({
        'https://api.chess.com/pub/player/janedoe/stats': json({}, 404),
        'https://lichess.org/api/user/jane_doe': json({ disabled: true }),
        [FIDE_PROFILE]: html(fidePage(['Not rated', 'Not rated', 'Not rated'])),
        'https://server.chess.ca/api/player/v1/150123': json({ player: {} }),
      });
      const member = await memberWithHandles();

      await refreshExternalRatings(member);

      const { lookups } = (await readMember(member._id)).externalRatings ?? {};
      expect(lookups?.chessCom?.ratings).toBeNull();
      expect(lookups?.lichess?.ratings).toBeNull();
      expect(lookups?.fide).toMatchObject({ ratings: [], worldRank: null });
      expect(lookups?.cfc?.ratings).toBeNull();
    });

    it('should save no FIDE ratings for an ID FIDE has no record of', async () => {
      answerWith({
        [FIDE_PROFILE]: html('<p>No record found please check ID number</p>'),
      });
      const member = await memberWithHandles({
        chessComUsername: '',
        lichessUsername: '',
        cfcId: '',
      });

      await refreshExternalRatings(member);

      const { lookups } = (await readMember(member._id)).externalRatings ?? {};
      expect(lookups?.fide?.ratings).toBeNull();
    });

    it('should rank a player FIDE counts as active among active players, and an inactive one among all', async () => {
      answerWith({
        [FIDE_PROFILE]: html(
          fidePage(
            ['2210', 'Not rated', 'Not rated'],
            fideRankBlock('World Rank', 9120, 15003),
          ),
        ),
      });
      const member = await memberWithHandles({
        chessComUsername: '',
        lichessUsername: '',
        cfcId: '',
      });

      await refreshExternalRatings(member);

      const { lookups } = (await readMember(member._id)).externalRatings ?? {};
      expect(lookups?.fide?.worldRank).toEqual({ rank: 9120, amongActive: true });
    });

    it('should look up only the handles the member has', async () => {
      answerWith(ANSWERS);
      const member = await memberWithHandles({ chessComUsername: '', cfcId: '' });

      await refreshExternalRatings(member);

      expect(fetch).toHaveBeenCalledTimes(2);
      const { lookups } = (await readMember(member._id)).externalRatings ?? {};
      expect(Object.keys(lookups ?? {}).sort()).toEqual(['fide', 'lichess']);
    });

    it('should keep what an unreachable site last gave for the same handle, and nothing for a new one', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      answerWith({
        ...ANSWERS,
        'https://lichess.org/api/user/jane_doe': json({}, 503),
        [FIDE_PROFILE]: json({}, 500),
      });
      const previous = [
        { timeControl: 'blitz' as const, rating: 1500, provisional: false },
      ];
      const member = await memberWithHandles({
        externalRatings: {
          lookups: {
            lichess: { handle: 'jane_doe', ratings: previous },
            fide: { handle: '2600999', ratings: previous },
          },
          checkedAt: CHECKED_AT,
        },
      });

      await refreshExternalRatings(member);

      const { lookups } = (await readMember(member._id)).externalRatings ?? {};
      expect(lookups?.lichess).toEqual({ handle: 'jane_doe', ratings: previous });
      expect(lookups?.fide).toEqual({ handle: '2600123', ratings: null });
      expect(console.error).toHaveBeenCalledTimes(2);
    });

    it('should report rather than reject when the ratings cannot be saved', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      answerWith(ANSWERS);
      const member = await memberWithHandles();
      vi.spyOn(MemberModel, 'updateOne').mockRejectedValue(new Error('down'));

      await expect(refreshExternalRatings(member)).resolves.toEqual(member);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Unable to save the external ratings'),
      );
    });
  });

  describe('hasUnlookedHandles', () => {
    it('should tell when one of the handles has yet to be looked up', async () => {
      const lookups = { lichess: { handle: 'jane_doe', ratings: [] } };
      const lookedUp = await memberWithHandles({
        chessComUsername: '',
        fideId: '',
        cfcId: '',
        externalRatings: { lookups, checkedAt: CHECKED_AT },
      });
      const given = await memberWithHandles({
        chessComUsername: '',
        cfcId: '',
        externalRatings: { lookups, checkedAt: CHECKED_AT },
      });
      const neverLookedUp = await memberWithHandles();
      const withoutHandles = await createMember();

      expect(hasUnlookedHandles(lookedUp)).toBe(false);
      expect(hasUnlookedHandles(given)).toBe(true);
      expect(hasUnlookedHandles(neverLookedUp)).toBe(true);
      expect(hasUnlookedHandles(withoutHandles)).toBe(false);
    });
  });

  describe('externalRatingsOf', () => {
    it("should give the stored ratings of the member's current handles only", async () => {
      const ratings = [
        { timeControl: 'rapid' as const, rating: 1520, provisional: false },
      ];
      const member = await memberWithHandles({
        lichessUsername: 'renamed',
        cfcId: '',
        externalRatings: {
          lookups: {
            chessCom: { handle: 'JaneDoe', ratings },
            lichess: { handle: 'jane_doe', ratings },
            fide: { handle: '2600123', ratings: null },
            cfc: { handle: '150123', ratings },
          },
          checkedAt: CHECKED_AT,
        },
      });

      expect(externalRatingsOf(member)).toEqual({
        chessCom: ratings,
        lichess: null,
        fide: null,
        cfc: null,
        fideWorldRank: null,
      });
    });

    it("should give FIDE's world rank along with its ratings", async () => {
      const worldRank = { rank: 129807, amongActive: false };
      const member = await memberWithHandles({
        externalRatings: {
          lookups: { fide: { handle: '2600123', ratings: [], worldRank } },
          checkedAt: CHECKED_AT,
        },
      });

      expect(externalRatingsOf(member)).toMatchObject({
        fide: [],
        fideWorldRank: worldRank,
      });
    });

    it('should give nothing for a member never looked up', async () => {
      const member = await memberWithHandles();

      expect(externalRatingsOf(member)).toEqual({
        chessCom: null,
        lichess: null,
        fide: null,
        cfc: null,
        fideWorldRank: null,
      });
    });
  });

  describe('externalRatingsFreshFor', () => {
    const checked = (overrides: Partial<Omit<MemberRecord, '_id'>> = {}) =>
      memberWithHandles({
        externalRatings: {
          lookups: {
            chessCom: { handle: 'JaneDoe', ratings: [] },
            lichess: { handle: 'jane_doe', ratings: [] },
            fide: { handle: '2600123', ratings: [] },
            cfc: { handle: '150123', ratings: [] },
          },
          checkedAt: CHECKED_AT,
        },
        ...overrides,
      });

    it('should never age for a member with no handles', async () => {
      const member = await createMember();

      expect(externalRatingsFreshFor(member)).toBe(Infinity);
    });

    it('should count down from the last look-up, to nothing once it ages out', async () => {
      const member = await checked();
      const now = Date.parse(CHECKED_AT);

      expect(externalRatingsFreshFor(member, now + HOUR_MS)).toBe(5 * HOUR_MS);
      expect(externalRatingsFreshFor(member, now + 7 * HOUR_MS)).toBe(0);
    });

    it('should need a look-up at once for a member never looked up or with a changed handle', async () => {
      const neverLookedUp = await memberWithHandles();
      const renamed = await checked({ fideId: '2600999' });
      const now = Date.parse(CHECKED_AT);

      expect(externalRatingsFreshFor(neverLookedUp, now)).toBe(0);
      expect(externalRatingsFreshFor(renamed, now)).toBe(0);
    });
  });
});
