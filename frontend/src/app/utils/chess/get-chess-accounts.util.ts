import {
  FEDERATION_NAMES,
  PLATFORM_TIME_CONTROLS,
  TIME_CONTROL_LABELS,
} from '@app/constants/external-ratings';
import {
  ChessAccount,
  ChessAccountRank,
  ChessAccountRating,
  ExternalRating,
  ExternalRatings,
  FideRanks,
  Member,
  RatingPlatform,
} from '@app/models';
import { isDefined } from '@app/utils/type-guards/is-defined.util';

// The member's accounts on other chess sites, in the order their profile lists them
export function getChessAccounts(
  member: Member,
  ratings: ExternalRatings | null,
): ChessAccount[] {
  const accounts: ChessAccount[] = [
    {
      platform: 'fide',
      label: 'FIDE',
      logoSrc: null,
      handle: member.fideId,
      url: `https://ratings.fide.com/profile/${member.fideId}`,
      slots: slots('fide', ratings?.fide),
      isFound: !!ratings?.fide,
      ranks: fideRanks(ratings?.fideRanks ?? null),
    },
    {
      platform: 'cfc',
      label: 'CFC',
      logoSrc: null,
      handle: member.cfcId,
      url: `https://www.chess.ca/en/ratings/p/?id=${member.cfcId}`,
      slots: slots('cfc', ratings?.cfc),
      isFound: !!ratings?.cfc,
      ranks: [],
    },
    {
      platform: 'chessCom',
      label: 'Chess.com',
      logoSrc: 'assets/club-link-icons/chesscom.svg',
      handle: member.chessComUsername,
      url: `https://www.chess.com/member/${member.chessComUsername}`,
      slots: slots('chessCom', ratings?.chessCom),
      isFound: !!ratings?.chessCom,
      ranks: [],
    },
    {
      platform: 'lichess',
      label: 'Lichess',
      logoSrc: 'assets/club-link-icons/lichess.svg',
      handle: member.lichessUsername,
      url: `https://lichess.org/@/${member.lichessUsername}`,
      slots: slots('lichess', ratings?.lichess),
      isFound: !!ratings?.lichess,
      ranks: [],
    },
  ];
  return accounts.filter(account => account.handle);
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

function fideRanks(ranks: FideRanks | null): ChessAccountRank[] {
  if (!ranks) {
    return [];
  }
  const national = FEDERATION_NAMES[ranks.federation] ?? ranks.federation;
  return [
    ranks.world ? { ...ranks.world, label: 'World rank' } : null,
    ranks.national ? { ...ranks.national, label: `${national} rank` } : null,
  ].filter(isDefined);
}
