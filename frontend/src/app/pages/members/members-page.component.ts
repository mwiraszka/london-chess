import {
  DialogService,
  DownloadIconComponent,
  InputComponent,
  PlusCircleIconComponent,
  SearchIconComponent,
  SwitchComponent,
  UploadIconComponent,
  UsersIconComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, firstValueFrom } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MembersTableComponent } from '@app/components/members-table/members-table.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { RatingChangesComponent } from '@app/components/rating-changes/rating-changes.component';
import {
  AdminCommandAction,
  AdminLinkAction,
  DataPaginationOptions,
  LoadStatus,
  Member,
  MemberWithNewRatings,
} from '@app/models';
import {
  AdminActionsService,
  CsvExportService,
  MembersApiService,
  MetaAndTitleService,
  StoreRequestService,
} from '@app/services';
import { AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { MembersActions, MembersSelectors } from '@app/store/members';
import { PARSE_CSV } from '@app/tokens';
import { bindSearchControl, isLccError, widestRows } from '@app/utils';

@Component({
  selector: 'lcc-members-page',
  template: `
    @if (viewModel$ | async; as vm) {
      <lcc-page-header
        heading="Members"
        [icon]="pageIcon">
      </lcc-page-header>

      <!-- Opened from the admin actions menu -->
      <input
        #ratingsInput
        class="lcc-visually-hidden"
        type="file"
        accept=".csv"
        aria-hidden="true"
        tabindex="-1"
        (change)="onRatingsInputChange(ratingsInput)" />

      <div class="filters">
        <ea-input
          class="filters__search"
          ariaLabel="Search members"
          placeholder="Search by name, city or username"
          [clearable]="true"
          [formControl]="searchControl"
          [icon]="searchIcon" />
        <ea-switch
          class="filters__switch"
          label="Show inactive members"
          [checked]="vm.options.filters.showInactiveMembers.value"
          (changed)="onToggleInactiveMembers($event, vm.options)" />
      </div>

      @if (vm.status === 'failed') {
        <lcc-load-failed
          title="Unable to load members"
          (retry)="onRetry()" />
      } @else {
        <lcc-members-table
          [filteredCount]="vm.filteredCount"
          [isAdmin]="vm.isAdmin"
          [isLoading]="vm.status === 'loading' || vm.isFetching"
          [isSafeMode]="vm.isSafeMode"
          [members]="vm.filteredMembers"
          [widestMembers]="widestMembers()"
          [options]="vm.options"
          (optionsChange)="onOptionsChange($event)">
        </lcc-members-table>
      }
    }
  `,
  styleUrl: './members-page.component.scss',
  imports: [
    CommonModule,
    InputComponent,
    LoadFailedComponent,
    MembersTableComponent,
    PageHeaderComponent,
    ReactiveFormsModule,
    SwitchComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  private readonly csvExport = inject(CsvExportService);
  private readonly dialogService = inject(DialogService);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);
  private readonly membersApi = inject(MembersApiService);

  // The widest members size the table from its first skeleton on, in the columns the
  // visitor's access shows
  protected readonly widestMembers = widestRows(
    this.store
      .select(AuthSelectors.selectApiScope)
      .pipe(switchMap(scope => this.membersApi.getWidestMembers(scope))),
  );

  protected readonly pageIcon = UsersIconComponent;
  protected readonly searchIcon = SearchIconComponent;
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  public readonly addMemberAction: AdminLinkAction = {
    label: 'Add member',
    icon: PlusCircleIconComponent,
    group: 'add',
    path: ['member', 'add'],
  };

  protected readonly isPreparingRatingChanges = signal(false);
  private readonly ratingsInput = viewChild<ElementRef<HTMLInputElement>>('ratingsInput');
  public readonly importRatingsAction: AdminCommandAction = {
    label: 'Import ratings from CSV',
    icon: UploadIconComponent,
    group: 'data',
    run: () => this.ratingsInput()?.nativeElement.click(),
    isLoading: this.isPreparingRatingChanges,
  };

  public readonly exportMembersAction: AdminCommandAction = {
    label: 'Export members to CSV',
    icon: DownloadIconComponent,
    group: 'data',
    run: () => this.csvExport.exportMembers(),
  };

  public viewModel$?: Observable<{
    filteredCount: number | null;
    filteredMembers: Member[];
    isAdmin: boolean;
    isFetching: boolean;
    isSafeMode: boolean;
    options: DataPaginationOptions<Member>;
    status: LoadStatus;
    totalCount: number;
  }>;

  private readonly parseCsv = inject(PARSE_CSV);
  private readonly storeRequests = inject(StoreRequestService);

  constructor() {
    inject(AdminActionsService).register(() => [
      this.addMemberAction,
      this.exportMembersAction,
      this.importRatingsAction,
    ]);
  }

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Members');
    this.metaAndTitleService.updateDescription(
      'Club ratings and other members information',
    );

    bindSearchControl(
      this.searchControl,
      this.store.select(MembersSelectors.selectOptions),
      options => this.onOptionsChange(options),
      this.destroyRef,
    );

    this.viewModel$ = combineLatest([
      this.store.select(MembersSelectors.selectFilteredCount),
      this.store.select(MembersSelectors.selectFilteredMembers),
      this.store.select(AuthSelectors.selectIsAdmin),
      this.store.select(MembersSelectors.selectIsFetchingFiltered),
      this.store.select(AppSelectors.selectIsSafeMode),
      this.store.select(MembersSelectors.selectOptions),
      this.store.select(MembersSelectors.selectTotalCount),
      this.store.select(MembersSelectors.selectFilteredMembersStatus),
    ]).pipe(
      map(
        ([
          filteredCount,
          filteredMembers,
          isAdmin,
          isFetching,
          isSafeMode,
          options,
          totalCount,
          status,
        ]) => ({
          filteredCount,
          filteredMembers,
          isAdmin,
          isFetching,
          isSafeMode,
          options,
          status,
          totalCount,
        }),
      ),
    );
  }

  public onOptionsChange(options: DataPaginationOptions<Member>): void {
    this.store.dispatch(MembersActions.paginationOptionsChanged({ options }));
  }

  public onToggleInactiveMembers(
    showInactiveMembers: boolean,
    options: DataPaginationOptions<Member>,
  ): void {
    this.onOptionsChange({
      ...options,
      page: 1,
      filters: {
        showInactiveMembers: {
          ...options.filters.showInactiveMembers,
          value: showInactiveMembers,
        },
      },
    });
  }

  public onRetry(): void {
    this.store.dispatch(MembersActions.fetchFilteredMembersRequested());
  }

  protected onRatingsInputChange(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    // Cleared so choosing the same file again still reports a change
    input.value = '';
    void this.onRatingsFileChosen(files);
  }

  public async onRatingsFileChosen([file]: readonly File[]): Promise<void> {
    if (!file) {
      return;
    }

    this.isPreparingRatingChanges.set(true);
    const ratingChanges = await this.prepareRatingChanges(file).finally(() =>
      this.isPreparingRatingChanges.set(false),
    );

    if (!ratingChanges) {
      return;
    }

    const { membersWithNewRatings, unmatchedMembers } = ratingChanges;
    await this.dialogService.open(RatingChangesComponent, {
      inputs: {
        confirmAction: () =>
          this.storeRequests.dispatch(
            MembersActions.updateMemberRatingsRequested({ membersWithNewRatings }),
            [
              MembersActions.updateMemberRatingsSucceeded,
              MembersActions.updateMemberRatingsFailed,
            ],
          ),
        membersWithNewRatings,
        unmatchedMembers,
      },
    }).result;
  }

  private async prepareRatingChanges(file: File): Promise<{
    membersWithNewRatings: MemberWithNewRatings[];
    unmatchedMembers: string[];
  } | null> {
    const expectedHeadersInCsv = ['first name', 'last name', 'old', 'new', 'peak'];
    const parsingResult = await this.parseCsv(file, expectedHeadersInCsv, 5);

    if (isLccError(parsingResult)) {
      this.store.dispatch(
        MembersActions.parseMemberRatingsFromCsvFailed({ error: parsingResult }),
      );
      return null;
    }

    const allMembers = await this.loadAllMembers();
    if (!allMembers) {
      return null;
    }

    const membersWithNewRatings: MemberWithNewRatings[] = [];
    const unmatchedMembers: string[] = [];

    parsingResult.forEach(row => {
      const [firstName, lastName, rating, newRating, newPeakRating] = row;
      const matchedMember = allMembers.find(
        member =>
          member.firstName === firstName &&
          member.lastName === lastName &&
          member.rating === rating,
      );

      if (matchedMember) {
        membersWithNewRatings.push({
          ...matchedMember,
          newRating,
          newPeakRating,
        });
      } else {
        unmatchedMembers.push(`${firstName} ${lastName}`);
      }
    });

    return { membersWithNewRatings, unmatchedMembers };
  }

  // Rating updates save every detail of each member, so only full admin records will do
  private async loadAllMembers(): Promise<Member[] | null> {
    const [members, totalCount, recordsScope] = await firstValueFrom(
      combineLatest([
        this.store.select(MembersSelectors.selectAllMembers),
        this.store.select(MembersSelectors.selectTotalCount),
        this.store.select(MembersSelectors.selectRecordsScope),
      ]),
    );

    if (recordsScope === 'admin' && totalCount > 0 && members.length === totalCount) {
      return members;
    }

    const outcome = await this.storeRequests.dispatch(
      MembersActions.fetchAllMembersRequested(),
      [MembersActions.fetchAllMembersSucceeded, MembersActions.fetchAllMembersFailed],
    );

    return outcome.type === MembersActions.fetchAllMembersSucceeded.type
      ? firstValueFrom(this.store.select(MembersSelectors.selectAllMembers))
      : null;
  }
}
