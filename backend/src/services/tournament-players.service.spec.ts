import { PlayerModel } from '../models/player.model';
import { useTestDatabase } from '../testing/database';
import { createMember } from '../testing/fixtures';
import {
  fold,
  matchPlayerNames,
  parsePlayerName,
  resolvePlayerIds,
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
  });
});
