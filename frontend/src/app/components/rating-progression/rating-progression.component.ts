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
import {
  RATING_AXIS_CEILING,
  RATING_AXIS_MAX_STEP,
  RATING_CHART_VISIBLE_YEARS,
} from '@app/constants/member-profile';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import {
  formatRating,
  quarterlyTicks,
  ratedResults,
  ratedTournamentLabel,
  tournamentTime,
} from '@app/utils';
import moment from '@app/utils/datetime/moment';

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

  private readonly ratedResults = computed(() =>
    ratedResults(this.state()?.results ?? []),
  );

  // A lone rating has no spread to fit, so its axis spans every rating the club sees
  protected readonly yMin = computed(() =>
    this.ratedResults().length === 1 ? 0 : undefined,
  );

  protected readonly yMax = computed(() => {
    const results = this.ratedResults();
    const rating = results.length === 1 ? results[0].rating : null;
    return rating === null ? undefined : Math.max(RATING_AXIS_CEILING, rating);
  });

  protected readonly visibleSpan = moment
    .duration(RATING_CHART_VISIBLE_YEARS, 'years')
    .asMilliseconds();

  protected readonly xValues = computed(() =>
    this.ratedResults().map(({ tournament }) => tournamentTime(tournament.date)),
  );

  protected readonly labels = computed(() =>
    this.ratedResults().map(({ tournament }) => ratedTournamentLabel(tournament)),
  );

  protected readonly xTicks = computed<LineChartTick[]>(() =>
    quarterlyTicks(this.xValues()),
  );

  protected readonly formatRating = formatRating;

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
