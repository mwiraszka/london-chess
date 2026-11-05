import { LineChartTick } from '@eagami/ui';

import { RATING_CHART_TICK_MONTHS } from '@app/constants/member-profile';
import { MemberTournamentResult, Tournament } from '@app/models';
import moment from '@app/utils/datetime/moment';

export function tournamentTime(date: string): number {
  return moment(date, 'YYYY-MM-DD').valueOf();
}

// A member with a result in more than one section, such as a championship's round robin
// and its final, is charted at the rating they started the tournament with: that of the
// first section they appear in, as the results list a tournament's sections in order
export function ratedResults(
  results: MemberTournamentResult[],
): MemberTournamentResult[] {
  const byTournament = new Map<number, MemberTournamentResult>();
  for (const result of results) {
    if (!result.tournament.isRated || result.rating === null) {
      continue;
    }
    if (!byTournament.has(result.tournament.number)) {
      byTournament.set(result.tournament.number, result);
    }
  }
  return [...byTournament.values()].sort(
    (a, b) =>
      a.tournament.date.localeCompare(b.tournament.date) ||
      a.tournament.number - b.tournament.number,
  );
}

// Each point's tooltip names the tournament it was rated at
export function ratedTournamentLabel({
  name,
  date,
}: Pick<Tournament, 'name' | 'date'>): string {
  return `${name} (${moment(date, 'YYYY-MM-DD').format('MMM D, YYYY')})`;
}

// One tick a quarter across the times, which run oldest first
export function quarterlyTicks(times: number[]): LineChartTick[] {
  if (!times.length) {
    return [];
  }
  const first = moment(times[0]).startOf('month');
  const tick = first
    .clone()
    .month(
      Math.floor(first.month() / RATING_CHART_TICK_MONTHS) * RATING_CHART_TICK_MONTHS,
    );
  const last = moment(times[times.length - 1]);
  const ticks: LineChartTick[] = [];
  while (tick.isSameOrBefore(last)) {
    ticks.push({ value: tick.valueOf(), label: tick.format('MMM YYYY') });
    tick.add(RATING_CHART_TICK_MONTHS, 'months');
  }
  return ticks;
}

// Ratings read as plain numbers, never with a thousands separator
export function formatRating(rating: number): string {
  return String(Math.round(rating));
}
