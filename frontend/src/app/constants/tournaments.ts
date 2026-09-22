import { TournamentFormat, Trophy } from '@app/models';

const CUP: Trophy = { file: 'trophy-cup.svg', label: 'Gold cup trophy', shape: 'cup' };
const BOWL: Trophy = {
  file: 'trophy-bowl.svg',
  label: 'Gold bowl trophy with blue and red tassels',
  shape: 'bowl',
};
const CHALICE: Trophy = {
  file: 'trophy-chalice.svg',
  label: 'Gold chalice trophy',
  shape: 'chalice',
};

// In the order they stand in a row
export const TROPHIES: Trophy[] = [CHALICE, CHALICE, BOWL, CUP, CHALICE, CHALICE];

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  swiss: 'Swiss',
  'round-robin': 'Round robin',
  match: 'Match',
  'tandem-simul': 'Tandem simul',
};

export const TOURNAMENT_SUBTITLE_LABELS: Record<TournamentFormat, string> = {
  swiss: 'Theme',
  'round-robin': 'Theme',
  match: 'Match',
  'tandem-simul': 'Simul givers',
};

export const TOURNAMENTS_PAGE_SIZES = [25, 50, 100];

export const MEMBER_TOURNAMENTS_PAGE_SIZES = [10, 25, 50];

// The longest month name and two-digit days make the widest date labels
export const WIDEST_DATE = '2000-09-30';
export const WIDEST_END_DATE = '2000-11-30';

export const LOADING_ENTRY_COUNT = 10;
export const LOADING_ROUND_COUNT = 6;

export const LOADING_RESULT_COUNT = 3;
