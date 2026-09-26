import { capitalize } from 'lodash';

import { TournamentFormat, Trophy, TrophyMetal, TrophyShape } from '@app/models';

const TROPHY_DESCRIPTIONS: Record<TrophyShape, string> = {
  cup: 'cup trophy',
  bowl: 'bowl trophy with blue and red tassels',
  chalice: 'chalice trophy',
};

// The bowl is only ever gold, so it alone has no metal in its file name
export function trophy(shape: TrophyShape, metal: TrophyMetal): Trophy {
  return {
    file: shape === 'bowl' ? 'trophy-bowl.svg' : `trophy-${shape}-${metal}.svg`,
    label: `${capitalize(metal)} ${TROPHY_DESCRIPTIONS[shape]}`,
    shape,
    metal,
  };
}

// In the order they stand in a row
export const TROPHIES: Trophy[] = [
  trophy('chalice', 'gold'),
  trophy('chalice', 'gold'),
  trophy('bowl', 'gold'),
  trophy('cup', 'gold'),
  trophy('chalice', 'gold'),
  trophy('chalice', 'gold'),
];

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

export const LOADING_ENTRY_COUNT = 10;
export const LOADING_ROUND_COUNT = 6;

export const LOADING_RESULT_COUNT = 3;
