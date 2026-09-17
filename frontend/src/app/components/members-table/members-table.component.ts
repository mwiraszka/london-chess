import {
  ArrowDownIconComponent,
  ArrowUpIconComponent,
  TrophyIconComponent,
} from '@eagami/ui';
import { UntilDestroy } from '@ngneat/until-destroy';
import { camelCase } from 'lodash';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { SafeModeNoticeComponent } from '@app/components/safe-mode-notice/safe-mode-notice.component';
import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import {
  AdminControlsConfig,
  BasicDialogResult,
  DataPaginationOptions,
  Dialog,
  Member,
} from '@app/models';
import { CamelCasePipe, FormatDatePipe, HighlightPipe, KebabCasePipe } from '@app/pipes';
import { DialogService, StoreRequestService } from '@app/services';
import { MembersActions } from '@app/store/members';
import { isCityChampion } from '@app/utils';

@UntilDestroy()
@Component({
  selector: 'lcc-members-table',
  templateUrl: './members-table.component.html',
  styleUrl: './members-table.component.scss',
  imports: [
    AdminControlsDirective,
    ArrowDownIconComponent,
    ArrowUpIconComponent,
    CamelCasePipe,
    CommonModule,
    FormatDatePipe,
    HighlightPipe,
    KebabCasePipe,
    RouterLink,
    SafeModeNoticeComponent,
    TextSkeletonComponent,
    TooltipDirective,
    TrophyIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersTableComponent {
  public readonly isCityChampion = isCityChampion;

  public readonly DEFAULT_TABLE_HEADERS = [
    'Name',
    'Rating',
    'Peak Rating',
    'City',
    'Chess.com Username',
    'Lichess Username',
  ];

  public readonly ADMIN_TABLE_HEADERS = [
    'First Name',
    'Last Name',
    'Rating',
    'Peak Rating',
    'City',
    'Chess.com Username',
    'Lichess Username',
    'Last Updated',
    'Born',
    'Email',
    'Phone Number',
    'Date Joined',
  ];

  @Input({ required: true }) isAdmin!: boolean;
  @Input({ required: true }) options!: DataPaginationOptions<Member>;
  @Input({ required: true }) isSafeMode!: boolean;
  @Input({ required: true }) members!: Member[];
  @Input() isLoading = false;

  @Output() public optionsChange = new EventEmitter<DataPaginationOptions<Member>>();

  // A page size of -1 shows every member, so the skeleton stops at a screenful
  protected get skeletonRows(): number[] {
    const rowCount = this.options.pageSize > 0 ? this.options.pageSize : 50;
    return Array.from({ length: rowCount }, (_, index) => index);
  }

  public get startIndex(): number {
    return this.options.pageSize * (this.options.page - 1) + 1;
  }

  private readonly storeRequests = inject(StoreRequestService);

  constructor(private readonly dialogService: DialogService) {}

  public onSelectTableHeader(headerLabel: string): void {
    const header = camelCase(headerLabel) as keyof Member;
    const isSameHeader = this.options.sortBy === header;

    let sortOrder: 'asc' | 'desc';

    if (isSameHeader) {
      sortOrder = this.options.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortOrder = ['rating', 'peakRating'].includes(header) ? 'desc' : 'asc';
    }

    this.optionsChange.emit({
      ...this.options,
      sortBy: header,
      page: 1,
      sortOrder,
    });
  }

  public getAdminControlsConfig(member: Member): AdminControlsConfig {
    return {
      editPath: ['member', 'edit', member.id!],
      buttonSize: 31,
      itemName: `${member.firstName} ${member.lastName}`,
      deleteCb: () => this.onDeleteMember(member),
    };
  }

  private async onDeleteMember(member: Member): Promise<void> {
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
