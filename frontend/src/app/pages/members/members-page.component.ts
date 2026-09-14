import {
  DownloadIconComponent,
  PlusCircleIconComponent,
  UploadIconComponent,
  UsersIconComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, firstValueFrom } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { DataToolbarComponent } from '@app/components/data-toolbar/data-toolbar.component';
import { MembersTableComponent } from '@app/components/members-table/members-table.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { RatingChangesComponent } from '@app/components/rating-changes/rating-changes.component';
import {
  AdminButton,
  BasicDialogResult,
  DataPaginationOptions,
  Dialog,
  InternalLink,
  Member,
  MemberWithNewRatings,
} from '@app/models';
import { DialogService, MetaAndTitleService } from '@app/services';
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

      <lcc-data-toolbar
        entity="member"
        [filteredCount]="vm.filteredCount"
        [options]="vm.options"
        searchPlaceholder="Search by name, city or username"
        (optionsChange)="onOptionsChange($event)"
        (optionsChangeNoFetch)="onOptionsChange($event, false)">
      </lcc-data-toolbar>

      <lcc-members-table
        [isAdmin]="vm.isAdmin"
        [isSafeMode]="vm.isSafeMode"
        [members]="vm.filteredMembers"
        [options]="vm.options"
        (optionsChange)="onOptionsChange($event)"
        (requestDeleteMember)="onRequestDeleteMember($event)">
      </lcc-members-table>
    }
  `,
  imports: [
    AdminToolbarComponent,
    CommonModule,
    DataToolbarComponent,
    MembersTableComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersPageComponent implements OnInit {
  protected readonly pageIcon = UsersIconComponent;

  @ViewChild('memberRatingChangesFileInput')
  public memberRatingChangesFileInput?: ElementRef<HTMLInputElement>;

  public readonly addMemberLink: InternalLink = {
    internalPath: ['member', 'add'],
    text: 'Add a member',
    icon: PlusCircleIconComponent,
  };

  public readonly updateRatingsFromCsvButton: AdminButton = {
    id: 'update-ratings-from-csv',
    tooltip: 'Update member ratings from CSV',
    icon: UploadIconComponent,
    action: () => this.memberRatingChangesFileInput?.nativeElement.click(),
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
    isSafeMode: boolean;
    options: DataPaginationOptions<Member>;
    totalCount: number;
  }>;

  private readonly parseCsv = inject(PARSE_CSV);

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

    this.viewModel$ = combineLatest([
      this.store.select(MembersSelectors.selectFilteredCount),
      this.store.select(MembersSelectors.selectFilteredMembers),
      this.store.select(AuthSelectors.selectIsAdmin),
      this.store.select(AppSelectors.selectIsSafeMode),
      this.store.select(MembersSelectors.selectOptions),
      this.store.select(MembersSelectors.selectTotalCount),
    ]).pipe(
      untilDestroyed(this),
      map(
        ([filteredCount, filteredMembers, isAdmin, isSafeMode, options, totalCount]) => ({
          filteredCount,
          filteredMembers,
          isAdmin,
          isSafeMode,
          options,
          totalCount,
        }),
      ),
    );
  }

  public onOptionsChange(options: DataPaginationOptions<Member>, fetch = true): void {
    this.store.dispatch(MembersActions.paginationOptionsChanged({ options, fetch }));
  }

  public onRequestDeleteMember(member: Member): void {
    this.store.dispatch(MembersActions.deleteMemberRequested({ member }));
  }

  public async onMemberRatingChangesFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    const expectedHeadersInCsv = ['first name', 'last name', 'old', 'new', 'peak'];
    const parsingResult = await this.parseCsv(file, expectedHeadersInCsv, 5);

    if (isLccError(parsingResult)) {
      this.store.dispatch(
        MembersActions.parseMemberRatingsFromCsvFailed({ error: parsingResult }),
      );
      return;
    }

    // Ensure all members have been fetched to compare against
    const allMembers = await firstValueFrom(
      combineLatest([
        this.store.select(MembersSelectors.selectAllMembers),
        this.store.select(MembersSelectors.selectTotalCount),
      ]).pipe(
        tap(([members, totalCount]) => {
          if (totalCount > 0 && members.length !== totalCount) {
            this.store.dispatch(MembersActions.fetchAllMembersRequested());
          }
        }),
        filter(
          ([members, totalCount]) => totalCount > 0 && members.length === totalCount,
        ),
        map(([members]) => members),
      ),
    );

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

    const dialogResult = await this.dialogService.open<
      RatingChangesComponent,
      'confirm' | 'cancel'
    >({
      componentType: RatingChangesComponent,
      inputs: { membersWithNewRatings, unmatchedMembers },
      isModal: false,
    });

    if (dialogResult !== 'confirm') {
      return;
    }

    this.store.dispatch(
      MembersActions.updateMemberRatingsRequested({ membersWithNewRatings }),
    );
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
    };

    const dialogResult = await this.dialogService.open<
      BasicDialogComponent,
      BasicDialogResult
    >({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: false,
    });

    if (dialogResult !== 'confirm') {
      return;
    }

    this.store.dispatch(MembersActions.exportMembersToCsvRequested());
  }
}
