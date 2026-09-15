import { BarChartIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { debounceTime, distinctUntilChanged, take } from 'rxjs/operators';

import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { FormErrorIconComponent } from '@app/components/form-error-icon/form-error-icon.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { PgnViewerComponent } from '@app/components/pgn-viewer/pgn-viewer.component';
import { FilterFormGroup, GameDetails } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { AppSelectors } from '@app/store/app';
import { MembersActions, MembersSelectors } from '@app/store/members';
import { PARSE_CSV } from '@app/tokens';
import {
  getOpeningTallies,
  getPlayerName,
  getPlyCount,
  getResultTallies,
  getScore,
  isExpired,
  isLccError,
} from '@app/utils';

import * as fromPgns from './pgns';
import { YEARS } from './years';

@UntilDestroy()
@Component({
  selector: 'lcc-game-archives-page',
  templateUrl: './game-archives-page.component.html',
  styleUrl: './game-archives-page.component.scss',
  imports: [
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
    CommonModule,
    FormErrorIconComponent,
    MemberLinkComponent,
    PageHeaderComponent,
    PgnViewerComponent,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameArchivesPageComponent implements OnInit, OnDestroy {
  protected readonly pageIcon = BarChartIconComponent;

  private readonly FILE_PATH = 'assets/eco-openings.csv';

  public activeYear!: string | null;
  public allGames: Map<string, GameDetails[]> = new Map();
  public chessOpenings: Map<string, string> | null = null;
  public filteredGames: Map<string, GameDetails[]> = new Map();
  public form!: FormGroup<FilterFormGroup>;
  public openingChartDatasets: ChartConfiguration<'doughnut'>['data']['datasets'] = [];
  public openingChartLabels: string[] = [];
  public openingChartOptions: ChartConfiguration<'doughnut'>['options'] = {};
  public resultChartDatasets: ChartConfiguration<'doughnut'>['data']['datasets'] = [];
  public resultChartLabels: string[] = [];
  public resultChartOptions: ChartConfiguration<'doughnut'>['options'] = {};
  private _showStats = false;
  private isDarkMode = false;

  public get showStats(): boolean {
    return this._showStats;
  }

  public set showStats(value: boolean) {
    if (this._showStats === value) {
      return;
    }

    this._showStats = value;

    if (value) {
      this.updateCharts();
    } else {
      this.destroyCharts();
    }
  }

  public get searchResultSummaryMessage(): string {
    const allGamesCount = Array.from(this.allGames.values()).flat().length;
    const filteredGameCount = this.filteredGameCount;

    if (filteredGameCount === 0) {
      return 'No matches 😢';
    }

    return `Showing ${filteredGameCount} / ${allGamesCount} ${filteredGameCount === 1 ? 'game' : 'games'}`;
  }

  public get filteredGameCount(): number {
    return Array.from(this.filteredGames.values()).flat().length;
  }

  @ViewChild(CdkVirtualScrollViewport)
  public cdkVirtualScrollViewport?: CdkVirtualScrollViewport;

  @ViewChild('openingChart')
  set openingChartCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this._openingChartCanvas = ref;
    this.tryInitOpeningChart();
  }
  private _openingChartCanvas?: ElementRef<HTMLCanvasElement>;
  public get openingChartCanvas(): ElementRef<HTMLCanvasElement> | undefined {
    return this._openingChartCanvas;
  }

  @ViewChild('resultChart')
  set resultChartCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this._resultChartCanvas = ref;
    this.tryInitResultChart();
  }
  private _resultChartCanvas?: ElementRef<HTMLCanvasElement>;
  public get resultChartCanvas(): ElementRef<HTMLCanvasElement> | undefined {
    return this._resultChartCanvas;
  }

  private openingChart?: Chart;
  private resultChart?: Chart;

  private readonly parseCsv = inject(PARSE_CSV);

  constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly formBuilder: FormBuilder,
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  @HostListener('window:resize')
  onResize(): void {
    this.cdkVirtualScrollViewport?.checkViewportSize();
  }

  public ngOnInit(): void {
    Chart.register(...registerables);

    this.metaAndTitleService.updateTitle('Game Archives');
    this.metaAndTitleService.updateDescription(
      'A collection of games played by London Chess Club members, going all the way back to 1974.',
    );

    // The intro credit links to a member profile, which needs the members loaded
    this.store
      .select(MembersSelectors.selectLastFullFetch)
      .pipe(take(1))
      .subscribe(lastFullFetch => {
        if (isExpired(lastFullFetch)) {
          this.store.dispatch(MembersActions.fetchAllMembersRequested());
        }
      });

    this.initForm();
    this.initGames();
    this.initFormValueChangeListeners();
    this.initDarkModeListener();
    this.loadChessOpenings();
    this.filterGames();

    // Listen for dark mode changes to update chart colors
    this.store
      .select(AppSelectors.selectIsDarkMode)
      .pipe(untilDestroyed(this))
      .subscribe(isDarkMode => {
        this.isDarkMode = isDarkMode;
        if (this.showStats) {
          this.updateCharts(true);
        }
      });
  }

  public ngOnDestroy(): void {
    if (this.openingChart) {
      this.openingChart.destroy();
      this.openingChart = undefined;
    }

    if (this.resultChart) {
      this.resultChart.destroy();
      this.resultChart = undefined;
    }
  }

  private get chartTextColor(): string {
    return this.isDarkMode ? '#ddd' : '#777';
  }

  private generateChartColors(count: number): string[] {
    const baseColors = [
      '#a51d2d', // Dark Red
      '#613583', // Dark Purple
      '#cd9309', // Golden
      '#3584e4', // Blue
      '#33d17a', // Green
      '#e66100', // Orange
      '#9141ac', // Purple
      '#c01c28', // Red
      '#1a5fb4', // Dark Blue
      '#26a269', // Dark Green
    ];

    const colors: string[] = [];

    // Generate variations of base colours if more are needed
    for (let i = 0; i < count; i++) {
      if (i < baseColors.length) {
        colors.push(baseColors[i]);
      } else {
        const baseColor = baseColors[i % baseColors.length];
        const opacity = 0.7 + 0.3 * Math.floor(i / baseColors.length);
        colors.push(
          baseColor +
            Math.floor(opacity * 255)
              .toString(16)
              .padStart(2, '0'),
        );
      }
    }

    return colors;
  }

  public trackByFn = (_index: number, item: GameDetails) => item.pgn;

  public onKeydown(event: Event): void {
    const key = (event as KeyboardEvent)?.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
    }
  }

  public originalOrder = () => 0;

  private initForm(): void {
    this.form = this.formBuilder.group({
      firstName: new FormControl('', { nonNullable: true }),
      lastName: new FormControl('', { nonNullable: true }),
      asWhite: new FormControl(true, { nonNullable: true }),
      asBlack: new FormControl(true, { nonNullable: true }),
      movesMin: new FormControl('', {
        nonNullable: true,
        validators: [Validators.max(999), Validators.pattern(/^[0-9]*$/)],
      }),
      movesMax: new FormControl('', {
        nonNullable: true,
        validators: [Validators.max(999), Validators.pattern(/^[0-9]*$/)],
      }),
      resultWhiteWon: new FormControl(true, { nonNullable: true }),
      resultDraw: new FormControl(true, { nonNullable: true }),
      resultBlackWon: new FormControl(true, { nonNullable: true }),
      resultInconclusive: new FormControl(true, { nonNullable: true }),
    });
  }

  private initGames(): void {
    YEARS.forEach(year => {
      const pgns = fromPgns[`pgns${year}`];
      this.allGames.set(
        year,
        pgns.map(pgn => {
          return {
            pgn,
            whiteFirstName: getPlayerName(pgn, 'first', 'White'),
            whiteLastName: getPlayerName(pgn, 'last', 'White'),
            whiteScore: getScore(pgn, 'White'),
            blackFirstName: getPlayerName(pgn, 'first', 'Black'),
            blackLastName: getPlayerName(pgn, 'last', 'Black'),
            blackScore: getScore(pgn, 'Black'),
            plyCount: getPlyCount(pgn),
          };
        }),
      );
    });
  }

  private initFormValueChangeListeners(): void {
    this.form.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(50), untilDestroyed(this))
      .subscribe(() => this.filterGames());

    this.form.controls['asBlack'].valueChanges.subscribe(asBlack => {
      if (!asBlack && !this.form.controls['asWhite'].value) {
        this.form.controls['asWhite'].setValue(true);
      }
    });

    this.form.controls['asWhite'].valueChanges.subscribe(asWhite => {
      if (!asWhite && !this.form.controls['asBlack'].value) {
        this.form.controls['asBlack'].setValue(true);
      }
    });

    this.form.controls['resultWhiteWon'].valueChanges.subscribe(resultWhiteWon => {
      if (
        !resultWhiteWon &&
        !this.form.controls['resultDraw'].value &&
        !this.form.controls['resultBlackWon'].value &&
        !this.form.controls['resultInconclusive'].value
      ) {
        this.form.controls['resultDraw'].setValue(true);
      }
    });

    this.form.controls['resultDraw'].valueChanges.subscribe(resultDraw => {
      if (
        !resultDraw &&
        !this.form.controls['resultDraw'].value &&
        !this.form.controls['resultBlackWon'].value &&
        !this.form.controls['resultInconclusive'].value
      ) {
        this.form.controls['resultWhiteWon'].setValue(true);
      }
    });

    this.form.controls['resultBlackWon'].valueChanges.subscribe(resultBlackWon => {
      if (
        !resultBlackWon &&
        !this.form.controls['resultWhiteWon'].value &&
        !this.form.controls['resultDraw'].value &&
        !this.form.controls['resultInconclusive'].value
      ) {
        this.form.controls['resultWhiteWon'].setValue(true);
      }
    });

    this.form.controls['resultInconclusive'].valueChanges.subscribe(
      resultInconclusive => {
        if (
          !resultInconclusive &&
          !this.form.controls['resultWhiteWon'].value &&
          !this.form.controls['resultDraw'].value &&
          !this.form.controls['resultBlackWon'].value
        ) {
          this.form.controls['resultWhiteWon'].setValue(true);
        }
      },
    );
  }

  private initDarkModeListener(): void {
    this.store
      .select(AppSelectors.selectIsDarkMode)
      .pipe(untilDestroyed(this))
      .subscribe(isDarkMode => {
        const color = isDarkMode ? '#bbb' : '#222';
        this.isDarkMode = isDarkMode;

        this.openingChartOptions = {
          responsive: true,
          color: color,
        };

        this.resultChartOptions = {
          responsive: true,
          color: color,
        };

        // Update existing charts with new options
        if (this.openingChart) {
          this.openingChart.options.color = color;
          this.openingChart.update();
        }

        if (this.resultChart) {
          this.resultChart.options.color = color;
          this.resultChart.update();
        }
      });
  }

  private destroyCharts(): void {
    this.openingChart?.destroy();
    this.openingChart = undefined;
    this.resultChart?.destroy();
    this.resultChart = undefined;
  }

  private buildCommonOptions(): ChartConfiguration<'doughnut'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 15, padding: 10, font: { size: 12 } },
        },
        tooltip: { enabled: true },
      },
      color: this.chartTextColor,
    };
  }

  private tryInitOpeningChart(): void {
    if (!this.showStats) return;
    if (this.openingChart || !this.openingChartCanvas || !this.openingChartLabels.length)
      return;
    this.openingChart = new Chart(this.openingChartCanvas.nativeElement, {
      type: 'doughnut',
      data: { labels: this.openingChartLabels, datasets: this.openingChartDatasets },
      options: this.buildCommonOptions(),
    });
  }

  private tryInitResultChart(): void {
    if (!this.showStats) return;
    if (this.resultChart || !this.resultChartCanvas || !this.resultChartLabels.length)
      return;
    this.resultChart = new Chart(this.resultChartCanvas.nativeElement, {
      type: 'doughnut',
      data: { labels: this.resultChartLabels, datasets: this.resultChartDatasets },
      options: this.buildCommonOptions(),
    });
  }

  private updateCharts(forceRecreate = false): void {
    if (!this.showStats) return;

    // Opening chart
    if (forceRecreate && this.openingChart) {
      this.openingChart.destroy();
      this.openingChart = undefined;
    }
    if (!this.openingChartLabels.length) {
      if (this.openingChart) {
        this.openingChart.destroy();
        this.openingChart = undefined;
      }
    } else if (this.openingChart) {
      this.openingChart.data.labels = this.openingChartLabels;
      this.openingChart.data.datasets = this.openingChartDatasets;
      this.openingChart.options.color = this.chartTextColor;
      this.openingChart.update();
    } else {
      this.tryInitOpeningChart();
    }

    // Result chart
    if (forceRecreate && this.resultChart) {
      this.resultChart.destroy();
      this.resultChart = undefined;
    }
    if (!this.resultChartLabels.length) {
      if (this.resultChart) {
        this.resultChart.destroy();
        this.resultChart = undefined;
      }
    } else if (this.resultChart) {
      this.resultChart.data.labels = this.resultChartLabels;
      this.resultChart.data.datasets = this.resultChartDatasets;
      this.resultChart.options.color = this.chartTextColor;
      this.resultChart.update();
    } else {
      this.tryInitResultChart();
    }
  }

  private async loadChessOpenings(): Promise<void> {
    const rawData = await fetch(this.FILE_PATH);
    const blob = await rawData.blob();
    const file = new File([blob], this.FILE_PATH, { type: 'text/csv' });

    const parsedData = await this.parseCsv(file, ['eco', 'name', 'moves'], 2);

    if (isLccError(parsedData)) {
      console.error('[LCC] Error parsing chess opening CSV data:', parsedData);
      return;
    }

    // Convert to a map of ECO codes mapped to their corresponding opening names
    this.chessOpenings = new Map(parsedData.map(opening => [opening[0], opening[1]]));

    this.updateStats(this.filteredGames);
    // Initialize charts after we have data if they should be shown
    if (this.showStats) {
      this.updateCharts();
    }
  }

  private async filterGames(): Promise<void> {
    const firstName = this.form.value['firstName']?.toLowerCase();
    const lastName = this.form.value['lastName']?.toLowerCase();
    const pliesMin = Number(this.form.value['movesMin']) * 2;
    const pliesMax = Number(this.form.value['movesMax']) * 2;
    const asWhite = this.form.value['asWhite'];
    const asBlack = this.form.value['asBlack'];
    const resultWhiteWon = this.form.value['resultWhiteWon'];
    const resultDraw = this.form.value['resultDraw'];
    const resultBlackWon = this.form.value['resultBlackWon'];
    const resultInconclusive = this.form.value['resultInconclusive'];

    this.filteredGames = new Map();
    this.allGames.forEach((games, year) => {
      const filteredGames = games
        .filter(game => {
          return (
            !firstName ||
            (asWhite && game.whiteFirstName?.toLowerCase().includes(firstName)) ||
            (asBlack && game.blackFirstName?.toLowerCase().includes(firstName))
          );
        })
        .filter(game => {
          return (
            !lastName ||
            (asWhite && game.whiteLastName?.toLowerCase().includes(lastName)) ||
            (asBlack && game.blackLastName?.toLowerCase().includes(lastName))
          );
        })
        .filter(game => {
          if (game.plyCount === undefined || !pliesMax) {
            return true;
          }
          return game.plyCount <= pliesMax;
        })
        .filter(game => {
          if (game.plyCount === undefined || !pliesMin) {
            return true;
          }
          return game.plyCount >= pliesMin;
        })
        .filter(game => {
          return (
            (resultWhiteWon && game.whiteScore === '1') ||
            (resultDraw && game.whiteScore === '1/2' && game.blackScore === '1/2') ||
            (resultBlackWon && game.blackScore === '1') ||
            (resultInconclusive && (game.whiteScore === '*' || game.blackScore === '*'))
          );
        });
      this.filteredGames.set(year, filteredGames);
    });

    this.updateStats(this.filteredGames);

    // Find first year with games
    const firstAvailableYear = Array.from(this.filteredGames.entries()).find(
      ([, games]) => games.length > 0,
    )?.[0];

    if (!firstAvailableYear) {
      this.activeYear = null;
    } else if (
      !this.activeYear ||
      !this.filteredGames.has(this.activeYear) ||
      !this.filteredGames.get(this.activeYear)?.length
    ) {
      this.activeYear = firstAvailableYear;
      this.changeDetectorRef.markForCheck();
    }
  }

  private updateStats(games: Map<string, GameDetails[]>): void {
    const pgns: string[] = [];
    for (const [year] of games) {
      const pgnsForThisYear = games.get(year)?.map(game => game.pgn) ?? [];
      pgns.push(...pgnsForThisYear);
    }

    const openingTallies = getOpeningTallies(pgns);
    if (!openingTallies?.size || !this.chessOpenings?.size) {
      this.openingChartLabels = [];
      this.openingChartDatasets = [];
    } else {
      this.openingChartLabels = Array.from(openingTallies.keys()).map(openingEco => {
        const opening = this.chessOpenings!.get(openingEco) ?? 'Unrecognized ECO code';
        const tally = openingTallies.get(openingEco);
        return `${opening} (${tally})`;
      });
      this.openingChartDatasets = [
        {
          data: Array.from(openingTallies!.values()),
          backgroundColor: this.generateChartColors(openingTallies.size),
        },
      ];
    }

    const resultTallies = getResultTallies(pgns);
    if (!resultTallies?.size) {
      this.resultChartLabels = [];
      this.resultChartDatasets = [];
    } else {
      const results = Array.from(resultTallies.keys());
      this.resultChartLabels = results.map(
        result => `${result} (${resultTallies.get(result)})`,
      );
      this.resultChartDatasets = [
        {
          data: Array.from(resultTallies.values()),
          backgroundColor: results.map(result => {
            switch (result) {
              case 'White wins':
                return '#eee';
              case 'Black wins':
                return '#111';
              case 'Draw':
                return '#999';
              case 'Inconclusive':
                return '#358';
              default:
                return '#d72';
            }
          }),
        },
      ];
    }

    // If stats are being shown, handle chart initialization or update
    if (this.showStats) {
      this.updateCharts();
    }
  }
}
