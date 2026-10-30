import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { ChessAccount, ExternalRatings, Member } from '@app/models';

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
    fideNationalRank: {
      rank: 412,
      amongActive: true,
      flag: 'gb-eng',
      country: 'England',
    },
  };
  const member: Member = {
    ...MOCK_MEMBERS[0],
    chessComUsername: 'jane',
    lichessUsername: 'jane_doe',
    fideId: '2600123',
    cfcId: '150123',
  };

  const linksOf = (accounts: ChessAccount[]) =>
    accounts.map(({ label, url }) => ({ label, url }));

  it('should link to FIDE and the CFC apart from the online accounts', () => {
    const { overTheBoard, online } = getChessAccounts(member, externalRatings);

    expect(linksOf(overTheBoard)).toEqual([
      { label: 'FIDE', url: 'https://ratings.fide.com/profile/2600123' },
      { label: 'CFC', url: 'https://www.chess.ca/en/ratings/p/?id=150123' },
    ]);
    expect(linksOf(online)).toEqual([
      { label: 'Chess.com', url: 'https://www.chess.com/member/jane' },
      { label: 'Lichess', url: 'https://lichess.org/@/jane_doe' },
    ]);
  });

  it("should give every one of a platform's time controls in its order, rated or not", () => {
    const {
      overTheBoard: [fide, cfc],
      online: [chessCom],
    } = getChessAccounts(member, externalRatings);

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
    const { overTheBoard, online } = getChessAccounts(member, externalRatings);
    const accounts = [...overTheBoard, ...online];
    const beforeAny = Object.values(getChessAccounts(member, null)).flat();

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

  it('should rank the member on FIDE alone, the world first and then their federation', () => {
    const {
      overTheBoard: [fide, ...others],
      online,
    } = getChessAccounts(member, externalRatings);

    expect(fide.ranks).toEqual([
      {
        label: 'World rank',
        emoji: '🌍',
        rank: 129807,
        tooltip: 'World rank among all players, as FIDE lists this member as inactive',
      },
      {
        label: 'National rank in England',
        emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        rank: 412,
        tooltip: 'National rank in England among active players',
      },
    ]);
    expect([...others, ...online].every(account => !account.ranks.length)).toBe(true);
  });

  it('should list only the accounts the member has', () => {
    const { overTheBoard, online } = getChessAccounts(
      { ...member, lichessUsername: '', cfcId: '' },
      externalRatings,
    );

    expect(overTheBoard.map(account => account.platform)).toEqual(['fide']);
    expect(online.map(account => account.platform)).toEqual(['chessCom']);
  });
});
