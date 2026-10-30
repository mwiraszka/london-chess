import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { ExternalRatings, Member } from '@app/models';

import { getChessAccounts } from './get-chess-accounts.util';

describe('getChessAccounts', () => {
  const externalRatings: ExternalRatings = {
    chessCom: [
      { timeControl: 'blitz', rating: 1580, provisional: false },
      { timeControl: 'rapid', rating: 1610, provisional: true },
    ],
    lichess: null,
    fide: [],
    cfc: [{ timeControl: 'regular', rating: 1802, provisional: false }],
    fideWorldRank: { rank: 129807, amongActive: false },
  };
  const member: Member = {
    ...MOCK_MEMBERS[0],
    chessComUsername: 'jane',
    lichessUsername: 'jane_doe',
    fideId: '2600123',
    cfcId: '150123',
  };

  it('should link to FIDE and the CFC first, then the online accounts', () => {
    const accounts = getChessAccounts(member, externalRatings);

    expect(accounts.map(({ label, url }) => ({ label, url }))).toEqual([
      { label: 'FIDE', url: 'https://ratings.fide.com/profile/2600123' },
      { label: 'CFC', url: 'https://www.chess.ca/en/ratings/p/?id=150123' },
      { label: 'Chess.com', url: 'https://www.chess.com/member/jane' },
      { label: 'Lichess', url: 'https://lichess.org/@/jane_doe' },
    ]);
  });

  it("should give every one of a platform's time controls in its order, rated or not", () => {
    const [fide, cfc, chessCom] = getChessAccounts(member, externalRatings);

    expect(chessCom.slots).toEqual([
      { timeControl: 'rapid', label: 'Rapid', rating: 1610, provisional: true },
      { timeControl: 'blitz', label: 'Blitz', rating: 1580, provisional: false },
      { timeControl: 'bullet', label: 'Bullet', rating: null, provisional: false },
    ]);
    expect(fide.slots.map(rating => [rating.label, rating.rating])).toEqual([
      ['Standard', null],
      ['Rapid', null],
      ['Blitz', null],
    ]);
    expect(cfc.slots.map(rating => [rating.label, rating.rating])).toEqual([
      ['Regular', 1802],
      ['Quick', null],
    ]);
  });

  it('should tell which platforms were reached and know the member', () => {
    const accounts = getChessAccounts(member, externalRatings);
    const beforeAny = getChessAccounts(member, null);

    expect(accounts.map(account => [account.label, account.isFound])).toEqual([
      ['FIDE', true],
      ['CFC', true],
      ['Chess.com', true],
      ['Lichess', false],
    ]);
    expect(beforeAny.every(account => !account.isFound)).toBe(true);
    expect(beforeAny[0].slots.map(rating => rating.label)).toEqual([
      'Standard',
      'Rapid',
      'Blitz',
    ]);
  });

  it("should give FIDE's world rank alone", () => {
    const [fide, ...others] = getChessAccounts(member, externalRatings);

    expect(fide.worldRank).toEqual({ rank: 129807, amongActive: false });
    expect(others.every(account => account.worldRank === null)).toBe(true);
  });

  it('should list only the accounts the member has', () => {
    const accounts = getChessAccounts(
      { ...member, lichessUsername: '', cfcId: '' },
      externalRatings,
    );

    expect(accounts.map(account => account.platform)).toEqual(['fide', 'chessCom']);
  });
});
