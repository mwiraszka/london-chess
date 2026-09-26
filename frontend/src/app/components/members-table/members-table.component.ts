import {
  DataTableColumn,
  DataTableSortState,
  EmptyStateComponent,
  FilterXIconComponent,
  PaginatorComponent,
  PaginatorState,
  TrophyIconComponent,
} from '@eagami/ui';

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { DataTableComponent } from '@app/components/data-table/data-table.component';
import { SafeModeNoticeComponent } from '@app/components/safe-mode-notice/safe-mode-notice.component';
import { MEMBERS_PAGE_SIZES } from '@app/constants/members-table';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import {
  AdminControlsConfig,
  BasicDialogResult,
  DataPaginationOptions,
  Dialog,
  Member,
} from '@app/models';
import { FormatDatePipe, HighlightPipe } from '@app/pipes';
import { DialogService, StoreRequestService } from '@app/services';
import { MembersActions } from '@app/store/members';
import { isCityChampion, pageRowCount } from '@app/utils';

// The sort keys hold what the server sorts by, so a page keeps the order it came in
export interface MemberRow {
  id: string;
  member: Member;
  number: number;
  name: string;
  firstName: string;
  lastName: string;
  rating: string;
  peakRating: string;
  city: string;
  chessComUsername: string;
  lichessUsername: string;
  lastUpdated: string;
  born: string;
  email: string;
  phoneNumber: string;
  dateJoined: string;
}

function toMemberRow(member: Member, number: number): MemberRow {
  return {
    id: member.id || `row-${number}`,
    member,
    number,
    name: `${member.lastName}, ${member.firstName}`,
    firstName: member.firstName,
    lastName: member.lastName,
    rating: member.rating,
    peakRating: member.peakRating,
    city: member.city,
    chessComUsername: member.chessComUsername,
    lichessUsername: member.lichessUsername,
    lastUpdated: member.modificationInfo.dateLastEdited,
    born: member.yearOfBirth,
    email: member.email,
    phoneNumber: member.phoneNumber,
    dateJoined: member.dateJoined,
  };
}

// The columns whose highest value comes first when they are first sorted
const DESCENDING_FIRST: string[] = ['rating', 'peakRating'];

type CellTemplate = TemplateRef<{ $implicit: MemberRow; value: unknown }>;

@Component({
  selector: 'lcc-members-table',
  templateUrl: './members-table.component.html',
  styleUrl: './members-table.component.scss',
  imports: [
    DataTableComponent,
    EmptyStateComponent,
    FormatDatePipe,
    HighlightPipe,
    NgTemplateOutlet,
    PaginatorComponent,
    RouterLink,
    SafeModeNoticeComponent,
    TooltipDirective,
    TrophyIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersTableComponent {
  public readonly isAdmin = input.required<boolean>();
  public readonly isSafeMode = input.required<boolean>();
  public readonly members = input.required<Member[]>();
  public readonly options = input.required<DataPaginationOptions<Member>>();
  public readonly filteredCount = input.required<number | null>();
  public readonly isLoading = input(false);
  public readonly widestMembers = input<Member[]>([]);

  public readonly optionsChange = output<DataPaginationOptions<Member>>();

  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly storeRequests = inject(StoreRequestService);

  private readonly nameCell = viewChild.required<CellTemplate>('nameCell');
  private readonly firstNameCell = viewChild.required<CellTemplate>('firstNameCell');
  private readonly lastNameCell = viewChild.required<CellTemplate>('lastNameCell');
  private readonly ratingCell = viewChild.required<CellTemplate>('ratingCell');
  private readonly peakRatingCell = viewChild.required<CellTemplate>('peakRatingCell');
  private readonly highlightCell = viewChild.required<CellTemplate>('highlightCell');
  private readonly dateCell = viewChild.required<CellTemplate>('dateCell');

  protected readonly emptyIcon = FilterXIconComponent;
  protected readonly isCityChampion = isCityChampion;
  protected readonly pageSizes = MEMBERS_PAGE_SIZES;

  // Admins see every detail and the controls to change it, unless safe mode hides them
  protected readonly showsDetails = computed(() => this.isAdmin() && !this.isSafeMode());

  // Placeholders replace the members during every fetch, so a change of filters shows at once
  protected readonly loading = computed(() => this.isLoading());

  protected readonly empty = computed(() => !this.loading() && !this.members().length);

  protected readonly loadingRowCount = computed(() =>
    pageRowCount(this.options().pageSize, this.filteredCount() ?? MEMBERS_PAGE_SIZES[0]),
  );

  private readonly startIndex = computed(() => {
    const { page, pageSize } = this.options();
    return pageSize * (page - 1) + 1;
  });

  protected readonly rows = computed<MemberRow[]>(() =>
    this.members().map((member, index) => toMemberRow(member, this.startIndex() + index)),
  );

  // Sized from the first skeleton on by the widest of every member, not just this page
  protected readonly sizingRows = computed(() =>
    this.widestMembers().map((member, index) => toMemberRow(member, index + 1)),
  );

  protected readonly columns = computed<DataTableColumn<MemberRow>[]>(() => {
    const number: DataTableColumn<MemberRow> = {
      key: 'number',
      label: '#',
      align: 'right',
    };
    const names: DataTableColumn<MemberRow>[] = this.showsDetails()
      ? [
          {
            key: 'firstName',
            label: 'First name',
            sortable: true,
            cellTemplate: this.firstNameCell(),
          },
          {
            key: 'lastName',
            label: 'Last name',
            sortable: true,
            cellTemplate: this.lastNameCell(),
          },
        ]
      : [{ key: 'name', label: 'Name', sortable: true, cellTemplate: this.nameCell() }];
    const ratings: DataTableColumn<MemberRow>[] = [
      {
        key: 'rating',
        label: 'Rating',
        sortable: true,
        align: 'right',
        cellTemplate: this.ratingCell(),
      },
      {
        key: 'peakRating',
        label: 'Peak rating',
        sortable: true,
        align: 'right',
        cellTemplate: this.peakRatingCell(),
      },
      { key: 'city', label: 'City', sortable: true, cellTemplate: this.highlightCell() },
      {
        key: 'chessComUsername',
        label: 'Chess.com username',
        sortable: true,
        cellTemplate: this.highlightCell(),
      },
      {
        key: 'lichessUsername',
        label: 'Lichess username',
        sortable: true,
        cellTemplate: this.highlightCell(),
      },
    ];
    const details: DataTableColumn<MemberRow>[] = this.showsDetails()
      ? [
          {
            key: 'lastUpdated',
            label: 'Last updated',
            sortable: true,
            align: 'right',
            cellTemplate: this.dateCell(),
          },
          { key: 'born', label: 'Born', sortable: true, align: 'right' },
          { key: 'email', label: 'Email', sortable: true },
          { key: 'phoneNumber', label: 'Phone number', sortable: true },
          {
            key: 'dateJoined',
            label: 'Date joined',
            sortable: true,
            align: 'right',
            cellTemplate: this.dateCell(),
          },
        ]
      : [];
    return [number, ...names, ...ratings, ...details];
  });

  protected readonly sortState = computed<DataTableSortState>(() => ({
    column: this.options().sortBy,
    direction: this.options().sortOrder,
  }));

  // A right click on a row offers admins its member's controls
  protected readonly rowControls = ({ member }: MemberRow): AdminControlsConfig => ({
    buttonSize: 31,
    deleteCb: () => this.onDeleteMember(member),
    editPath: ['member', 'edit', member.id],
    itemName: `${member.firstName} ${member.lastName}`,
  });

  // Rows lead to the member's profile, except for admins, whose rows hold controls
  protected readonly rowHref = computed(() =>
    this.showsDetails()
      ? undefined
      : ({ member }: MemberRow) =>
          member.number === null ? null : `/members/${member.number}`,
  );

  public onSorted({ column }: DataTableSortState): void {
    const options = this.options();
    const sortBy = column as keyof Member;
    const sortOrder =
      options.sortBy === sortBy
        ? options.sortOrder === 'asc'
          ? 'desc'
          : 'asc'
        : DESCENDING_FIRST.includes(column)
          ? 'desc'
          : 'asc';

    this.optionsChange.emit({ ...options, sortBy, sortOrder, page: 1 });
  }

  public onPageChanged({ page, pageSize }: PaginatorState): void {
    this.optionsChange.emit({ ...this.options(), page, pageSize });
  }

  public onOpenProfile({ member }: MemberRow): void {
    if (member.number !== null) {
      this.router.navigate(['/members', member.number]);
    }
  }

  public async onDeleteMember(member: Member): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Delete ${member.firstName} ${member.lastName}?`,
      confirmButtonText: 'Delete',
      confirmButtonType: 'warning',
      confirmAction: () =>
        this.storeRequests.dispatch(MembersActions.deleteMemberRequested({ member }), [
          MembersActions.deleteMemberSucceeded,
          MembersActions.deleteMemberFailed,
        ]),
    };

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: true,
    });
  }
}
