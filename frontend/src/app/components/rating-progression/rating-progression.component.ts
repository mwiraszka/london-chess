import {
  ChartSeries,
  LineChartComponent,
  LineChartTick,
  SkeletonComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { RATING_AXIS_CEILING, RATING_AXIS_MAX_STEP } from '@app/constants/member-profile';
import { MemberTournamentResult } from '@app/models';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import moment from '@app/utils/datetime/moment';

// The chart opens on the latest five years and scrolls back through the rest
const VISIBLE_SPAN_MS = moment.duration(5, 'years').asMilliseconds();

// Ticks on the first month of each quarter, whatever days the tournaments fall on
const TICK_INTERVAL_MONTHS = 3;

function tournamentTime(date: string): number {
  return moment(date, 'YYYY-MM-DD').valueOf();
}

/**
 * A member's rating at each rated tournament they played, oldest first. The
 * tournaments table below it lists the same results, so it doubles as the chart's
 * table view.
 */
@Component({
  selector: 'lcc-rating-progression',
  templateUrl: './rating-progression.component.html',
  styleUrl: './rating-progression.component.scss',
  imports: [LineChartComponent, LoadFailedComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Every state holds the chart's exact height, so nothing below moves as it loads
  host: { '[style.height.px]': 'chartHeight' },
})
export class RatingProgressionComponent {
  public readonly memberNumber = input.required<number>();

  private readonly store = inject(Store);

  protected readonly chartHeight = 240;

  protected readonly maxRatingStep = RATING_AXIS_MAX_STEP;

  private readonly state = toSignal(
    toObservable(this.memberNumber).pipe(
      switchMap(memberNumber =>
        combineLatest([
          this.store.select(TournamentsSelectors.selectMemberResults(memberNumber)),
          this.store.select(TournamentsSelectors.selectMemberResultsStatus(memberNumber)),
        ]),
      ),
      map(([results, status]) => ({ results, status })),
    ),
  );

  protected readonly status = computed(() => this.state()?.status ?? 'loading');

  // A member who moved sections mid-tournament has a result in each, so only the
  // section where they played the most rounds stands for that tournament
  private readonly ratedResults = computed(() => {
    const byTournament = new Map<number, MemberTournamentResult>();
    for (const result of this.state()?.results ?? []) {
      if (!result.tournament.isRated || result.rating === null) {
        continue;
      }
      const kept = byTournament.get(result.tournament.number);
      if (!kept || result.roundsPlayed > kept.roundsPlayed) {
        byTournament.set(result.tournament.number, result);
      }
    }
    return [...byTournament.values()].sort(
      (a, b) =>
        a.tournament.date.localeCompare(b.tournament.date) ||
        a.tournament.number - b.tournament.number,
    );
  });

  // A lone rating has no spread to fit, so its axis spans every rating the club sees
  protected readonly yMin = computed(() =>
    this.ratedResults().length === 1 ? 0 : undefined,
  );

  protected readonly yMax = computed(() => {
    const results = this.ratedResults();
    const rating = results.length === 1 ? results[0].rating : null;
    return rating === null ? undefined : Math.max(RATING_AXIS_CEILING, rating);
  });

  protected readonly visibleSpan = VISIBLE_SPAN_MS;

  protected readonly xValues = computed(() =>
    this.ratedResults().map(({ tournament }) => tournamentTime(tournament.date)),
  );

  // Each point's tooltip names the tournament it was rated at
  protected readonly labels = computed(() =>
    this.ratedResults().map(({ tournament }) => {
      const date = moment(tournament.date, 'YYYY-MM-DD').format('MMM D, YYYY');
      return `${tournament.name} (${date})`;
    }),
  );

  protected readonly xTicks = computed<LineChartTick[]>(() => {
    const times = this.xValues();
    if (!times.length) {
      return [];
    }
    const first = moment(times[0]).startOf('month');
    const tick = first
      .clone()
      .month(Math.floor(first.month() / TICK_INTERVAL_MONTHS) * TICK_INTERVAL_MONTHS);
    const last = moment(times[times.length - 1]);
    const ticks: LineChartTick[] = [];
    while (tick.isSameOrBefore(last)) {
      ticks.push({ value: tick.valueOf(), label: tick.format('MMM YYYY') });
      tick.add(TICK_INTERVAL_MONTHS, 'months');
    }
    return ticks;
  });

  // Ratings read as plain numbers, never with a thousands separator
  protected readonly formatRating = (rating: number): string =>
    String(Math.round(rating));

  protected readonly series = computed<ChartSeries[]>(() => [
    { name: 'Rating at start', data: this.ratedResults().map(({ rating }) => rating) },
  ]);

  public onRetry(): void {
    this.store.dispatch(
      TournamentsActions.fetchMemberTournamentsRequested({
        memberNumber: this.memberNumber(),
      }),
    );
  }
}
