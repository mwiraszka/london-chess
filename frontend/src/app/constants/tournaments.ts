import { BadgeVariant, SelectOption } from '@eagami/ui';
import { capitalize } from 'lodash-es';

import {
  TournamentFormData,
  TournamentFormat,
  TournamentTiming,
  Trophy,
  TrophyMetal,
  TrophyShape,
} from '@app/models';

const TROPHY_DESCRIPTIONS: Record<TrophyShape, string> = {
  cup: 'cup trophy',
  bowl: 'bowl trophy with blue and red tassels',
  chalice: 'chalice trophy',
};

// Each drawing's view box, which gives its image a shape before the file has loaded
const TROPHY_SIZES: Record<TrophyShape, { width: number; height: number }> = {
  cup: { width: 180, height: 274 },
  bowl: { width: 236, height: 178 },
  chalice: { width: 104, height: 248 },
};

// The bowl is only ever gold, so it alone has no metal in its file name
export function trophy(shape: TrophyShape, metal: TrophyMetal): Trophy {
  return {
    file: shape === 'bowl' ? 'trophy-bowl.svg' : `trophy-${shape}-${metal}.svg`,
    label: `${capitalize(metal)} ${TROPHY_DESCRIPTIONS[shape]}`,
    shape,
    metal,
    ...TROPHY_SIZES[shape],
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

export const TOURNAMENT_TIMING_BADGES: Record<
  TournamentTiming,
  { label: string; variant: BadgeVariant }
> = {
  upcoming: { label: 'Upcoming', variant: 'info' },
  'in-progress': { label: 'In progress', variant: 'success' },
};

export const TOURNAMENT_SUBTITLE_LABELS: Record<TournamentFormat, string> = {
  swiss: 'Theme',
  'round-robin': 'Theme',
  match: 'Match',
  'tandem-simul': 'Simul givers',
};

export const TOURNAMENTS_PAGE_SIZES = [25, 50, 100];

export const MEMBER_TOURNAMENTS_PAGE_SIZES = [10, 25, 50];

export const LOADING_RESULT_COUNT = 3;

export const TOURNAMENT_FORMAT_OPTIONS: SelectOption[] = (
  Object.keys(TOURNAMENT_FORMAT_LABELS) as TournamentFormat[]
).map(format => ({ value: format, label: TOURNAMENT_FORMAT_LABELS[format] }));

// The details a tournament's form edits; its results change only through an import
export const TOURNAMENT_FORM_DATA_PROPERTIES = [
  'name',
  'subtitle',
  'date',
  'endDate',
  'format',
  'timeControl',
  'isRated',
  'articleId',
  'registrationOpens',
  'registrationCloses',
] as const;

export const INITIAL_TOURNAMENT_FORM_DATA: TournamentFormData = {
  name: '',
  subtitle: '',
  date: '',
  endDate: null,
  format: 'swiss',
  timeControl: '',
  isRated: true,
  articleId: null,
  registrationOpens: null,
  registrationCloses: null,
  sections: null,
  games: null,
};

// How many problems an import lists before summing up the rest
export const MAX_LISTED_IMPORT_PROBLEMS = 10;
