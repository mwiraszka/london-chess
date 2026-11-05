import { DataTableSortState } from '@eagami/ui';

import { HeadToHeadSide } from '@app/models';

// Each side's colour from the theme, as the charts take theirs as CSS colours
export const HEAD_TO_HEAD_COLORS: Record<HeadToHeadSide, string> = {
  first: 'var(--lcc-head-to-head-first)',
  second: 'var(--lcc-head-to-head-second)',
};

export const HEAD_TO_HEAD_DRAW_COLOR = 'var(--lcc-head-to-head-draw)';

// The sides as the page's address names them, after the colours of their cards
export const HEAD_TO_HEAD_QUERY_PARAMS: Record<HeadToHeadSide, string> = {
  first: 'blue',
  second: 'red',
};

export const HEAD_TO_HEAD_PAGE_SIZES = [10, 25, 50];

export const HEAD_TO_HEAD_CHART_HEIGHT = 240;

// A donut cuts its caption short at the width of its hole, and this height leaves room for
// "Tournaments" in every brand's font
export const SHARED_TOURNAMENTS_DONUT_HEIGHT = 260;

export const HEAD_TO_HEAD_INITIAL_SORT: DataTableSortState = {
  column: 'date',
  direction: 'desc',
};
