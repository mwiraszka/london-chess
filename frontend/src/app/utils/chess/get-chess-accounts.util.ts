import {
  PLATFORM_TIME_CONTROLS,
  TIME_CONTROL_LABELS,
} from '@app/constants/external-ratings';
import {
  ChessAccount,
  ChessAccountGroups,
  ChessAccountRank,
  ChessAccountRating,
  ExternalRating,
  ExternalRatings,
  FideRank,
  Member,
  RatingPlatform,
} from '@app/models';

import { flagEmoji } from '../common/flag-emoji.util';
import { chessAccountUrl } from './chess-account-url.util';

// The member's accounts on other chess sites, those for over the board play apart from
// those online, in the order their profile lists them
export function getChessAccounts(
  member: Member,
  ratings: ExternalRatings | null,
): ChessAccountGroups {
  const overTheBoard: ChessAccount[] = [
    {
      platform: 'fide',
      label: 'FIDE',
      logoSrc: null,
      handle: member.fideId,
      url: chessAccountUrl('fide', member.fideId),
      slots: slots('fide', ratings?.fide),
      isFound: !!ratings?.fide,
      ranks: fideRanks(ratings),
    },
    {
      platform: 'cfc',
      label: 'CFC',
      logoSrc: null,
      handle: member.cfcId,
      url: chessAccountUrl('cfc', member.cfcId),
      slots: slots('cfc', ratings?.cfc),
      isFound: !!ratings?.cfc,
      ranks: [],
    },
  ];
  const online: ChessAccount[] = [
    {
      platform: 'chessCom',
      label: 'Chess.com',
      logoSrc: 'assets/club-link-icons/chesscom.svg',
      handle: member.chessComUsername,
      url: chessAccountUrl('chessCom', member.chessComUsername),
      slots: slots('chessCom', ratings?.chessCom),
      isFound: !!ratings?.chessCom,
      ranks: [],
    },
    {
      platform: 'lichess',
      label: 'Lichess',
      logoSrc: 'assets/club-link-icons/lichess.svg',
      handle: member.lichessUsername,
      url: chessAccountUrl('lichess', member.lichessUsername),
      slots: slots('lichess', ratings?.lichess),
      isFound: !!ratings?.lichess,
      ranks: [],
    },
  ];
  return {
    overTheBoard: overTheBoard.filter(account => account.handle),
    online: online.filter(account => account.handle),
  };
}

// Every time control the platform is shown with, rated or not, so they line up down the list
function slots(
  platform: RatingPlatform,
  ratings: ExternalRating[] | null | undefined,
): ChessAccountRating[] {
  return PLATFORM_TIME_CONTROLS[platform].map(timeControl => {
    const found = ratings?.find(rating => rating.timeControl === timeControl);
    return {
      timeControl,
      label: TIME_CONTROL_LABELS[timeControl],
      rating: found?.rating ?? null,
      provisional: found?.provisional ?? false,
    };
  });
}

function fideRanks(ratings: ExternalRatings | null): ChessAccountRank[] {
  const world = ratings?.fideWorldRank;
  const national = ratings?.fideNationalRank;
  return [
    ...(world ? [rankOf('World rank', '🌍', world)] : []),
    ...(national
      ? [
          rankOf(
            `National rank in ${national.country}`,
            flagEmoji(national.flag),
            national,
          ),
        ]
      : []),
  ];
}

function rankOf(
  label: string,
  emoji: string,
  { rank, amongActive }: FideRank,
): ChessAccountRank {
  return {
    label,
    emoji,
    rank,
    tooltip: amongActive
      ? `${label} among active players`
      : `${label} among all players, as FIDE lists this member as inactive`,
  };
}
