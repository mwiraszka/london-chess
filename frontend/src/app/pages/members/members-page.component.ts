import {
  ButtonComponent,
  DownloadIconComponent,
  InputComponent,
  PlusCircleIconComponent,
  SearchIconComponent,
  SwitchComponent,
  UploadIconComponent,
  UsersIconComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, withLatestFrom } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MembersTableComponent } from '@app/components/members-table/members-table.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { RatingChangesComponent } from '@app/components/rating-changes/rating-changes.component';
import { SEARCH_DEBOUNCE } from '@app/constants/filters';
import {
  AdminButton,
  BasicDialogResult,
  DataPaginationOptions,
  Dialog,
  InternalLink,
  LoadStatus,
  Member,
  MemberWithNewRatings,
} from '@app/models';
import { DialogService, MetaAndTitleService, StoreRequestService } from '@app/services';
import { AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { MembersActions, MembersSelectors } from '@app/store/members';
import { PARSE_CSV } from '@app/tokens';
import { isLccError } from '@app/utils';

@UntilDestroy()
@Component({
  selector: 'lcc-members-page',
  template: `
    @if (viewModel$ | async; as vm) {
      <lcc-page-header
        heading="Members"
        [icon]="pageIcon">
      </lcc-page-header>

      @if (vm.isAdmin) {
        <input
          #memberRatingChangesFileInput
          type="file"
          accept=".csv"
          style="display: none"
          (change)="onMemberRatingChangesFileSelected($event)" />
        <lcc-admin-toolbar
          [adminLinks]="[addMemberLink]"
          [adminButtons]="[updateRatingsFromCsvButton, exportToCsvButton]">
        </lcc-admin-toolbar>
      }

      <div class="filters">
        <ea-input
          class="filters__search"
          label="Search"
          placeholder="Search by name, city or username"
          [formControl]="searchControl"
          [icon]="searchIcon" />
        <ea-switch
          class="filters__switch"
          label="Show inactive members"
          [checked]="vm.options.filters.showInactiveMembers.value"
          (changed)="onToggleInactiveMembers($event, vm.options)" />
        <ea-button
          class="filters__clear"
          variant="ghost"
          size="md"
          [disabled]="!hasFilters(vm.options)"
          (clicked)="onClearFilters(vm.options)">
          Clear filters
        </ea-button>
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
          [options]="vm.options"
          (optionsChange)="onOptionsChange($event)">
        </lcc-members-table>
      }
    }
  `,
  styleUrl: './members-page.component.scss',
  imports: [
    AdminToolbarComponent,
    ButtonComponent,
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
  protected readonly pageIcon = UsersIconComponent;
  protected readonly searchIcon = SearchIconComponent;
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  @ViewChild('memberRatingChangesFileInput')
  public memberRatingChangesFileInput?: ElementRef<HTMLInputElement>;

  public readonly addMemberLink: InternalLink = {
    internalPath: ['member', 'add'],
    text: 'Add a member',
    icon: PlusCircleIconComponent,
  };

  private readonly isPreparingRatingChanges = signal(false);

  public readonly updateRatingsFromCsvButton: AdminButton = {
    id: 'update-ratings-from-csv',
    tooltip: 'Update member ratings from CSV',
    icon: UploadIconComponent,
    action: () => this.memberRatingChangesFileInput?.nativeElement.click(),
    isLoading: this.isPreparingRatingChanges,
  };

  public readonly exportToCsvButton: AdminButton = {
    id: 'export-to-csv',
    tooltip: 'Export to CSV',
    icon: DownloadIconComponent,
    action: () => this.onExportToCsv(),
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

  constructor(
    private readonly dialogService: DialogService,
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Members');
    this.metaAndTitleService.updateDescription(
      'Club ratings and other members information',
    );

    // The box shows the search in force, wherever it was set, and sends new text on a pause
    this.store
      .select(MembersSelectors.selectOptions)
      .pipe(untilDestroyed(this))
      .subscribe(({ search }) => {
        if (this.searchControl.value !== search) {
          this.searchControl.setValue(search, { emitEvent: false });
        }
      });
    this.searchControl.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE),
        distinctUntilChanged(),
        withLatestFrom(this.store.select(MembersSelectors.selectOptions)),
        untilDestroyed(this),
      )
      .subscribe(([search, options]) =>
        this.onOptionsChange({ ...options, search, page: 1 }),
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
      untilDestroyed(this),
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

  public onOptionsChange(options: DataPaginationOptions<Member>, fetch = true): void {
    this.store.dispatch(MembersActions.paginationOptionsChanged({ options, fetch }));
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

  public onClearFilters(options: DataPaginationOptions<Member>): void {
    this.onOptionsChange({
      ...options,
      page: 1,
      search: '',
      filters: {
        showInactiveMembers: { ...options.filters.showInactiveMembers, value: false },
      },
    });
  }

  protected hasFilters({ search, filters }: DataPaginationOptions<Member>): boolean {
    return search !== '' || filters.showInactiveMembers.value;
  }

  public onRetry(): void {
    this.store.dispatch(MembersActions.fetchFilteredMembersRequested());
  }

  public async onMemberRatingChangesFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

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
    await this.dialogService.open<RatingChangesComponent, BasicDialogResult>({
      componentType: RatingChangesComponent,
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
      isModal: false,
    });
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

  public async onExportToCsv(): Promise<void> {
    if (!this.viewModel$) {
      return;
    }

    const memberCount = await firstValueFrom(
      this.viewModel$.pipe(map(vm => vm.totalCount)),
    );

    if (!memberCount) {
      return;
    }

    const dialog: Dialog = {
      title: 'Confirm',
      body: `Export all ${memberCount} members to a CSV file?`,
      confirmButtonText: 'Export',
      confirmButtonType: 'primary',
      confirmAction: () =>
        this.storeRequests.dispatch(MembersActions.exportMembersToCsvRequested(), [
          MembersActions.exportMembersToCsvSucceeded,
          MembersActions.exportMembersToCsvFailed,
        ]),
    };

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: false,
    });
  }
}
