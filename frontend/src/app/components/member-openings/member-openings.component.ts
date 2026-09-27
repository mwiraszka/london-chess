import { PieChartComponent, PieChartSlice, SkeletonComponent } from '@eagami/ui';
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
import { OpeningCount } from '@app/models';
import { GamesActions, GamesSelectors } from '@app/store/games';

// Beyond this many slices the rest share one, since a donut cannot tell many small ones apart
const MAX_SLICES = 6;

export interface OpeningsChart {
  colour: 'White' | 'Black';
  slices: PieChartSlice[];
}

function toSlices(openings: OpeningCount[]): PieChartSlice[] {
  if (openings.length <= MAX_SLICES) {
    return openings.map(({ opening, gameCount }) => ({
      label: opening,
      value: gameCount,
    }));
  }
  const shown = openings.slice(0, MAX_SLICES - 1);
  const otherCount = openings
    .slice(MAX_SLICES - 1)
    .reduce((total, { gameCount }) => total + gameCount, 0);
  return [
    ...shown.map(({ opening, gameCount }) => ({ label: opening, value: gameCount })),
    { label: 'Other', value: otherCount },
  ];
}

/**
 * The opening families a member reached with each colour in the game archives.
 */
@Component({
  selector: 'lcc-member-openings',
  templateUrl: './member-openings.component.html',
  styleUrl: './member-openings.component.scss',
  imports: [LoadFailedComponent, PieChartComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberOpeningsComponent {
  public readonly memberNumber = input.required<number>();

  private readonly store = inject(Store);

  protected readonly chartHeight = 240;

  private readonly state = toSignal(
    toObservable(this.memberNumber).pipe(
      switchMap(memberNumber =>
        combineLatest([
          this.store.select(GamesSelectors.selectMemberOpenings(memberNumber)),
          this.store.select(GamesSelectors.selectMemberOpeningsStatus(memberNumber)),
        ]),
      ),
      map(([openings, status]) => ({ openings, status })),
    ),
  );

  protected readonly status = computed(() => this.state()?.status ?? 'loading');

  protected readonly charts = computed<OpeningsChart[]>(() => {
    const openings = this.state()?.openings;
    return openings
      ? [
          { colour: 'White', slices: toSlices(openings.white) },
          { colour: 'Black', slices: toSlices(openings.black) },
        ]
      : [];
  });

  protected readonly hasGames = computed(() =>
    this.charts().some(({ slices }) => slices.length > 0),
  );

  protected readonly formatGameCount = (count: number): string =>
    count === 1 ? '1 game' : `${count} games`;

  protected onRetry(): void {
    this.store.dispatch(
      GamesActions.fetchMemberOpeningsRequested({ memberNumber: this.memberNumber() }),
    );
  }
}
