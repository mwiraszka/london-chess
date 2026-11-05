import {
  ChartSeries,
  LineChartComponent,
  LineChartTick,
  SkeletonComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { combineLatest, of } from 'rxjs';
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
import { HEAD_TO_HEAD_CHART_HEIGHT } from '@app/constants/head-to-head';
import {
  RATING_AXIS_CEILING,
  RATING_AXIS_MAX_STEP,
  RATING_CHART_VISIBLE_YEARS,
} from '@app/constants/member-profile';
import { ChartedMember, LoadStatus, MemberTournamentResult } from '@app/models';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import {
  combinedLoadStatus,
  formatRating,
  quarterlyTicks,
  ratedResults,
  ratedTournamentLabel,
  tournamentTime,
} from '@app/utils';
import moment from '@app/utils/datetime/moment';

interface RatingPoint {
  tournament: MemberTournamentResult['tournament'];
  // One per member, null for a member who did not play the tournament
  ratings: (number | null)[];
}

/**
 * Several members' ratings at each rated tournament they played, oldest first, each
 * line in its member's colour and carried across the tournaments only the others played.
 */
@Component({
  selector: 'lcc-rating-comparison',
  templateUrl: './rating-comparison.component.html',
  styleUrl: './rating-comparison.component.scss',
  imports: [LineChartComponent, LoadFailedComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.min-height.px]': 'chartHeight' },
})
export class RatingComparisonComponent {
  public readonly members = input.required<ChartedMember[]>();

  private readonly store = inject(Store);

  protected readonly chartHeight = HEAD_TO_HEAD_CHART_HEIGHT;
  protected readonly maxRatingStep = RATING_AXIS_MAX_STEP;
  protected readonly visibleSpan = moment
    .duration(RATING_CHART_VISIBLE_YEARS, 'years')
    .asMilliseconds();
  protected readonly formatRating = formatRating;

  private readonly loads = toSignal(
    toObservable(this.members).pipe(
      switchMap(members =>
        members.length
          ? combineLatest(
              members.map(({ number }) =>
                combineLatest([
                  this.store.select(TournamentsSelectors.selectMemberResults(number)),
                  this.store.select(
                    TournamentsSelectors.selectMemberResultsStatus(number),
                  ),
                ]),
              ),
            )
          : of<[MemberTournamentResult[] | null, LoadStatus][]>([]),
      ),
      map(loads => loads.map(([results, status]) => ({ results, status }))),
    ),
    { initialValue: [] },
  );

  protected readonly status = computed(() =>
    combinedLoadStatus(...this.loads().map(({ status }) => status)),
  );

  private readonly points = computed<RatingPoint[]>(() => {
    const loads = this.loads();
    const byTournament = new Map<number, RatingPoint>();
    loads.forEach(({ results }, index) => {
      for (const { tournament, rating } of ratedResults(results ?? [])) {
        const point = byTournament.get(tournament.number) ?? {
          tournament,
          ratings: loads.map(() => null),
        };
        point.ratings[index] = rating;
        byTournament.set(tournament.number, point);
      }
    });
    return [...byTournament.values()].sort(
      (a, b) =>
        a.tournament.date.localeCompare(b.tournament.date) ||
        a.tournament.number - b.tournament.number,
    );
  });

  private readonly ratings = computed(() =>
    this.points().flatMap(({ ratings }) => ratings.filter(rating => rating !== null)),
  );

  // A lone rating has no spread to fit, so its axis spans every rating the club sees
  protected readonly yMin = computed(() => (this.ratings().length === 1 ? 0 : undefined));

  protected readonly yMax = computed(() => {
    const ratings = this.ratings();
    return ratings.length === 1 ? Math.max(RATING_AXIS_CEILING, ratings[0]) : undefined;
  });

  protected readonly xValues = computed(() =>
    this.points().map(({ tournament }) => tournamentTime(tournament.date)),
  );

  protected readonly labels = computed(() =>
    this.points().map(({ tournament }) => ratedTournamentLabel(tournament)),
  );

  protected readonly xTicks = computed<LineChartTick[]>(() =>
    quarterlyTicks(this.xValues()),
  );

  protected readonly series = computed<ChartSeries[]>(() =>
    this.members().map(({ name, color }, index) => ({
      name,
      color,
      data: this.points().map(({ ratings }) => ratings[index]),
    })),
  );

  public onRetry(): void {
    this.members().forEach(({ number }, index) => {
      if (this.loads()[index]?.status === 'failed') {
        this.store.dispatch(
          TournamentsActions.fetchMemberTournamentsRequested({ memberNumber: number }),
        );
      }
    });
  }
}
