import {
  BarChartComponent,
  ChartSeries,
  PieChartComponent,
  PieChartSlice,
} from '@eagami/ui';

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  HEAD_TO_HEAD_COLORS,
  HEAD_TO_HEAD_DRAW_COLOR,
} from '@app/constants/head-to-head';
import { HeadToHeadGame, HeadToHeadSide, HeadToHeadTally } from '@app/models';
import {
  formatScore,
  pointsByYear,
  tallyByColor,
  tallyGames,
  totalPoints,
} from '@app/utils';

/**
 * The score of two members' games against each other, with how the games went, by the
 * colour the first member played and by year.
 */
@Component({
  selector: 'lcc-head-to-head-results',
  templateUrl: './head-to-head-results.component.html',
  styleUrl: './head-to-head-results.component.scss',
  imports: [BarChartComponent, PieChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeadToHeadResultsComponent {
  public readonly games = input.required<HeadToHeadGame[]>();
  public readonly names = input.required<Record<HeadToHeadSide, string>>();

  protected readonly formatScore = formatScore;

  protected readonly points = computed(() => totalPoints(this.games()));

  protected readonly resultSlices = computed<PieChartSlice[]>(() => {
    const { wins, draws, losses } = tallyGames(this.games());
    const { first, second } = this.names();
    return [
      { label: `${first} won`, value: wins, color: HEAD_TO_HEAD_COLORS.first },
      { label: 'Drawn', value: draws, color: HEAD_TO_HEAD_DRAW_COLOR },
      { label: `${second} won`, value: losses, color: HEAD_TO_HEAD_COLORS.second },
    ];
  });

  private readonly byColor = computed(() => tallyByColor(this.games()));

  // Games whose colours were not recorded tell nothing about them
  protected readonly hasColors = computed(() =>
    Object.values(this.byColor()).some(
      ({ wins, draws, losses }) => wins + draws + losses > 0,
    ),
  );

  // The member is named in the heading, which wraps, as the chart cuts long labels short
  protected readonly colorLabels = ['As White', 'As Black'];

  protected readonly colorSeries = computed<ChartSeries[]>(() => {
    const { white, black } = this.byColor();
    const { first, second } = this.names();
    const counts = (key: keyof HeadToHeadTally): number[] => [white[key], black[key]];
    return [
      { name: `${first} won`, data: counts('wins'), color: HEAD_TO_HEAD_COLORS.first },
      { name: 'Drawn', data: counts('draws'), color: HEAD_TO_HEAD_DRAW_COLOR },
      {
        name: `${second} won`,
        data: counts('losses'),
        color: HEAD_TO_HEAD_COLORS.second,
      },
    ];
  });

  private readonly years = computed(() => pointsByYear(this.games()));

  // A single year has nothing to compare it with
  protected readonly hasYears = computed(() => this.years().length > 1);

  protected readonly yearLabels = computed(() =>
    this.years().map(({ year }) => String(year)),
  );

  protected readonly yearSeries = computed<ChartSeries[]>(() => {
    const { first, second } = this.names();
    return [
      {
        name: first,
        data: this.years().map(({ firstPoints }) => firstPoints),
        color: HEAD_TO_HEAD_COLORS.first,
      },
      {
        name: second,
        data: this.years().map(({ secondPoints }) => secondPoints),
        color: HEAD_TO_HEAD_COLORS.second,
      },
    ];
  });
}
