import {
  AccordionComponent,
  AccordionItemComponent,
  ArrowLeftRightIconComponent,
  AvatarComponent,
  ButtonComponent,
  CardComponent,
  DropdownComponent,
  EmptyStateComponent,
  ScaleIconComponent,
  SelectOption,
  SkeletonComponent,
  TooltipDirective,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { combineLatest, of } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { HeadToHeadGamesComponent } from '@app/components/head-to-head-games/head-to-head-games.component';
import { HeadToHeadResultsComponent } from '@app/components/head-to-head-results/head-to-head-results.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { RatingComparisonComponent } from '@app/components/rating-comparison/rating-comparison.component';
import { SharedTournamentsComponent } from '@app/components/shared-tournaments/shared-tournaments.component';
import {
  HEAD_TO_HEAD_CHART_HEIGHT,
  HEAD_TO_HEAD_COLORS,
  HEAD_TO_HEAD_QUERY_PARAMS,
} from '@app/constants/head-to-head';
import { ChartedMember, HeadToHeadSide, MemberProfile } from '@app/models';
import { RatingLabelPipe } from '@app/pipes';
import { MemberProfilesService, MetaAndTitleService } from '@app/services';
import { GamesActions, GamesSelectors } from '@app/store/games';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import { combinedLoadStatus, isDefined, isRecordNumber } from '@app/utils';

/**
 * Sets two members with accounts against each other: their games, their ratings over
 * time and the tournaments they both played. The members chosen live in the address, so
 * a comparison can be shared.
 */
@Component({
  selector: 'lcc-head-to-head-page',
  templateUrl: './head-to-head-page.component.html',
  styleUrl: './head-to-head-page.component.scss',
  imports: [
    AccordionComponent,
    AccordionItemComponent,
    AvatarComponent,
    ButtonComponent,
    CardComponent,
    DropdownComponent,
    EmptyStateComponent,
    HeadToHeadGamesComponent,
    HeadToHeadResultsComponent,
    LoadFailedComponent,
    PageHeaderComponent,
    RatingComparisonComponent,
    RatingLabelPipe,
    RouterLink,
    SharedTournamentsComponent,
    SkeletonComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lcc-page--reading' },
})
export class HeadToHeadPageComponent implements OnInit {
  private readonly memberProfiles = inject(MemberProfilesService);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  protected readonly pageIcon = ScaleIconComponent;
  protected readonly swapIcon = ArrowLeftRightIconComponent;
  protected readonly sides: HeadToHeadSide[] = ['first', 'second'];
  // Read out for each card, which shows its side only by its colour
  protected readonly sideLabels: Record<HeadToHeadSide, string> = {
    first: 'Blue side',
    second: 'Red side',
  };
  protected readonly skeletonHeight = `${HEAD_TO_HEAD_CHART_HEIGHT}px`;
  protected readonly profilesStatus = this.memberProfiles.status;

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    requireSync: true,
  });

  // The member number chosen on each side, as the address gives it
  protected readonly numbers = computed<Record<HeadToHeadSide, number | null>>(() => {
    const params = this.queryParams();
    const numberOn = (side: HeadToHeadSide): number | null => {
      const value = params.get(HEAD_TO_HEAD_QUERY_PARAMS[side]);
      return value !== null && isRecordNumber(value) ? Number(value) : null;
    };
    return { first: numberOn('first'), second: numberOn('second') };
  });

  protected readonly members = computed<Record<HeadToHeadSide, MemberProfile | null>>(
    () => {
      const { first, second } = this.numbers();
      return {
        first: this.memberProfiles.profileFor(first),
        second: this.memberProfiles.profileFor(second),
      };
    },
  );

  // Each side offers every member but the one chosen on the other
  protected readonly options = computed<Record<HeadToHeadSide, SelectOption[]>>(() => {
    const { first, second } = this.numbers();
    const optionsBesides = (other: number | null): SelectOption[] =>
      this.memberProfiles.all().map(profile => ({
        value: String(profile.number),
        label: this.fullName(profile),
        disabled: profile.number === other,
      }));
    return { first: optionsBesides(second), second: optionsBesides(first) };
  });

  protected readonly pairing = computed(() => {
    const { first, second } = this.members();
    return first && second && first.number !== second.number ? { first, second } : null;
  });

  protected readonly names = computed<Record<HeadToHeadSide, string> | null>(() => {
    const pairing = this.pairing();
    return pairing
      ? { first: this.fullName(pairing.first), second: this.fullName(pairing.second) }
      : null;
  });

  protected readonly chartedMembers = computed<ChartedMember[]>(() => {
    const pairing = this.pairing();
    return pairing
      ? this.sides.map(side => ({
          number: pairing[side].number,
          name: this.fullName(pairing[side]),
          color: HEAD_TO_HEAD_COLORS[side],
        }))
      : [];
  });

  private readonly pairing$ = toObservable(this.pairing);

  protected readonly comparison = toSignal(
    this.pairing$.pipe(
      switchMap(pairing => {
        if (!pairing) {
          return of(null);
        }
        const [first, second] = [pairing.first.number, pairing.second.number];
        return combineLatest({
          games: this.store.select(GamesSelectors.selectHeadToHead(first, second)),
          gamesStatus: this.store.select(
            GamesSelectors.selectHeadToHeadStatus(first, second),
          ),
          firstResults: this.store.select(
            TournamentsSelectors.selectMemberResults(first),
          ),
          secondResults: this.store.select(
            TournamentsSelectors.selectMemberResults(second),
          ),
          resultsStatus: combineLatest([
            this.store.select(TournamentsSelectors.selectMemberResultsStatus(first)),
            this.store.select(TournamentsSelectors.selectMemberResultsStatus(second)),
          ]).pipe(map(statuses => combinedLoadStatus(...statuses))),
        });
      }),
    ),
    { initialValue: null },
  );

  constructor() {
    // Fetched once a pairing, as tournaments and games only change by import
    this.pairing$
      .pipe(
        filter(isDefined),
        switchMap(({ first, second }) =>
          combineLatest([
            this.store.select(
              GamesSelectors.selectHeadToHead(first.number, second.number),
            ),
            this.store.select(TournamentsSelectors.selectMemberResults(first.number)),
            this.store.select(TournamentsSelectors.selectMemberResults(second.number)),
          ]).pipe(
            take(1),
            map(([games, firstResults, secondResults]) => ({
              first: first.number,
              second: second.number,
              games,
              firstResults,
              secondResults,
            })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ first, second, games, firstResults, secondResults }) => {
        if (!games) {
          this.fetchGames(first, second);
        }
        if (!firstResults) {
          this.fetchResults(first);
        }
        if (!secondResults) {
          this.fetchResults(second);
        }
      });
  }

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Head to Head');
    this.metaAndTitleService.updateDescription(
      'Compare two London Chess Club members: their games against each other, their ratings over time and the tournaments they both played.',
    );
    this.memberProfiles.load();
  }

  protected valueOf(side: HeadToHeadSide): string {
    return this.members()[side] ? String(this.numbers()[side]) : '';
  }

  public onSelect(side: HeadToHeadSide, value: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [HEAD_TO_HEAD_QUERY_PARAMS[side]]: value || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // The cards keep their colours, so each member moves to the other side
  public onSwap(): void {
    const { first, second } = this.numbers();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        [HEAD_TO_HEAD_QUERY_PARAMS.first]: second,
        [HEAD_TO_HEAD_QUERY_PARAMS.second]: first,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  public onRetryProfiles(): void {
    this.memberProfiles.load();
  }

  public onRetryGames(): void {
    const pairing = this.pairing();
    if (pairing) {
      this.fetchGames(pairing.first.number, pairing.second.number);
    }
  }

  public onRetryResults(): void {
    const pairing = this.pairing();
    if (pairing) {
      this.fetchResults(pairing.first.number);
      this.fetchResults(pairing.second.number);
    }
  }

  protected fullName({ firstName, lastName }: MemberProfile): string {
    return `${firstName} ${lastName}`;
  }

  protected initials({ firstName, lastName }: MemberProfile): string {
    return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  }

  private fetchGames(firstNumber: number, secondNumber: number): void {
    this.store.dispatch(
      GamesActions.fetchHeadToHeadRequested({ firstNumber, secondNumber }),
    );
  }

  private fetchResults(memberNumber: number): void {
    this.store.dispatch(
      TournamentsActions.fetchMemberTournamentsRequested({ memberNumber }),
    );
  }
}
