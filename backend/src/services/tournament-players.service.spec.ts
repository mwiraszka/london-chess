import { PlayerModel } from '../models/player.model';
import { useTestDatabase } from '../testing/database';
import { createMember } from '../testing/fixtures';
import {
  fold,
  linkPlayersToMembers,
  matchPlayerNames,
  parsePlayerName,
  resolvePlayerIds,
  unlinkPlayers,
} from './tournament-players.service';

describe('tournament players', () => {
  useTestDatabase();

  describe('parsePlayerName', () => {
    it('should read "Last, First" with any suffix after the first name', () => {
      expect(parsePlayerName(' Alsoued,  M  Wassim ')).toEqual({
        firstName: 'M Wassim',
        lastName: 'Alsoued',
        suffix: '',
      });
      expect(parsePlayerName('Smith, John Jr.')).toEqual({
        firstName: 'John',
        lastName: 'Smith',
        suffix: 'Jr',
      });
      expect(parsePlayerName('Oliver-Barrera, Matao Sr')).toEqual({
        firstName: 'Matao',
        lastName: 'Oliver-Barrera',
        suffix: 'Sr',
      });
    });

    it('should take a name without a comma as a last name', () => {
      expect(parsePlayerName('Magnus')).toEqual({
        firstName: '',
        lastName: 'Magnus',
        suffix: '',
      });
    });
  });

  describe('fold', () => {
    it('should ignore accents, case, spaces and punctuation', () => {
      expect(fold("O'Brien-Zoë Ann")).toBe('obrienzoeann');
    });
  });

  describe('matchPlayerNames', () => {
    it('should prefer the player linked to a member, then the one with more games', async () => {
      const member = await createMember({
        firstName: 'Jane',
        lastName: 'Doe',
        number: 3,
      });
      await PlayerModel.create({ firstName: 'Jane', lastName: 'Doe', gameCount: 40 });
      const linked = await PlayerModel.create({
        firstName: 'Jane',
        lastName: 'Doe',
        memberId: member._id.toString(),
      });
      await PlayerModel.create({ firstName: 'Rick', lastName: 'Roe', gameCount: 1 });
      const busier = await PlayerModel.create({
        firstName: 'Rick',
        lastName: 'Roe',
        gameCount: 9,
      });

      const matches = await matchPlayerNames(['Doe, Jane', 'Roe, Rick']);

      expect(matches).toEqual([
        { name: 'Doe, Jane', playerId: linked._id.toString(), memberNumber: 3 },
        { name: 'Roe, Rick', playerId: busier._id.toString(), memberNumber: null },
      ]);
    });

    it('should match a new player to a member only by an unambiguous full name', async () => {
      await createMember({ firstName: 'Sam', lastName: 'Twin', number: 1 });
      await createMember({ firstName: 'Sam', lastName: 'Twin', number: 2 });
      await createMember({ firstName: 'G', lastName: 'Initial', number: 4 });

      const matches = await matchPlayerNames(['Twin, Sam', 'Initial, G.', 'Solo']);

      expect(matches.map(({ memberNumber }) => memberNumber)).toEqual([null, null, null]);
    });

    it('should match a known player without a member to the member carrying their name', async () => {
      await createMember({ firstName: 'Nia', lastName: 'New', number: 9 });
      const known = await PlayerModel.create({ firstName: 'Nia', lastName: 'New' });

      const [match] = await matchPlayerNames(['New, Nia']);

      expect(match).toEqual({
        name: 'New, Nia',
        playerId: known._id.toString(),
        memberNumber: 9,
      });
    });

    it('should not treat a player with a different suffix as the same person', async () => {
      await PlayerModel.create({ firstName: 'John', lastName: 'Smith', suffix: 'Sr' });

      const [match] = await matchPlayerNames(['Smith, John Jr']);

      expect(match.playerId).toBeNull();
    });
  });

  describe('resolvePlayerIds', () => {
    it('should reuse known players and add the rest, linked to their member', async () => {
      const member = await createMember({
        firstName: 'Rick',
        lastName: 'Roe',
        number: 8,
      });
      const known = await PlayerModel.create({ firstName: 'Jane', lastName: 'Doe' });

      const ids = await resolvePlayerIds([
        'Doe, Jane',
        'Roe, Rick',
        ' Roe, Rick ',
        'New, Nia',
      ]);

      const added = await PlayerModel.find({ _id: { $ne: known._id } }).lean();
      expect(ids.get('Doe, Jane')).toBe(known._id.toString());
      expect(ids.size).toBe(3);
      expect(
        added.map(({ lastName, memberId, gameCount }) => ({
          lastName,
          memberId,
          gameCount,
        })),
      ).toEqual(
        expect.arrayContaining([
          { lastName: 'Roe', memberId: member._id.toString(), gameCount: 0 },
          { lastName: 'New', memberId: null, gameCount: 0 },
        ]),
      );
      expect(added).toHaveLength(2);
    });

    it('should add nothing when every player is known', async () => {
      const known = await PlayerModel.create({ firstName: 'Jane', lastName: 'Doe' });

      const ids = await resolvePlayerIds(['Doe, Jane']);

      expect(ids).toEqual(new Map([['Doe, Jane', known._id.toString()]]));
      expect(await PlayerModel.countDocuments()).toBe(1);
    });

    it('should link a known player to the member who joined after them', async () => {
      const known = await PlayerModel.create({ firstName: 'Nia', lastName: 'New' });
      const member = await createMember({ firstName: 'Nia', lastName: 'New' });

      const ids = await resolvePlayerIds(['New, Nia']);

      expect(ids.get('New, Nia')).toBe(known._id.toString());
      expect((await PlayerModel.findById(known._id).lean())?.memberId).toBe(
        member._id.toString(),
      );
    });
  });

  describe('linkPlayersToMembers', () => {
    it("should link the players without a member who carry the member's full name", async () => {
      const member = await createMember({ firstName: 'Zoë', lastName: "O'Brien" });
      const other = await createMember({ firstName: 'Rick', lastName: 'Roe' });
      const spelled = await PlayerModel.create({ firstName: 'Zoe', lastName: 'OBrien' });
      const accented = await PlayerModel.create({
        firstName: 'Zoë',
        lastName: "O'Brien",
      });
      await PlayerModel.create({ firstName: 'Z.', lastName: "O'Brien" });
      await PlayerModel.create({
        firstName: 'Zoë',
        lastName: "O'Brien",
        memberId: other._id.toString(),
      });
      await PlayerModel.create({ firstName: 'Rick', lastName: 'Roe' });

      const linked = await linkPlayersToMembers([member._id.toString()]);

      expect(linked).toEqual(
        expect.arrayContaining([spelled._id.toString(), accented._id.toString()]),
      );
      expect(linked).toHaveLength(2);
      expect(await PlayerModel.countDocuments({ memberId: member._id.toString() })).toBe(
        2,
      );
      expect(await PlayerModel.countDocuments({ memberId: null })).toBe(2);
    });

    it('should leave a name that several members share unlinked', async () => {
      const member = await createMember({ firstName: 'Sam', lastName: 'Twin' });
      await createMember({ firstName: 'Sam', lastName: 'Twin' });
      await PlayerModel.create({ firstName: 'Sam', lastName: 'Twin' });

      const linked = await linkPlayersToMembers([member._id.toString()]);

      expect(linked).toEqual([]);
      expect(await PlayerModel.countDocuments({ memberId: null })).toBe(1);
    });
  });

  describe('unlinkPlayers', () => {
    it('should unlink only the players it is given', async () => {
      const member = await createMember();
      const [first, second] = await PlayerModel.create([
        { firstName: 'Jane', lastName: 'Doe', memberId: member._id.toString() },
        { firstName: 'Jane', lastName: 'Doe', memberId: member._id.toString() },
      ]);

      await unlinkPlayers([first._id.toString()]);

      expect((await PlayerModel.findById(first._id).lean())?.memberId).toBeNull();
      expect((await PlayerModel.findById(second._id).lean())?.memberId).toBe(
        member._id.toString(),
      );
    });
  });
});
