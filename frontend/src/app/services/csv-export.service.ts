import { DialogService } from '@eagami/ui';
import { Action, ActionCreator, MemoizedSelector, Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { Injectable, inject } from '@angular/core';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { Dialog } from '@app/models';
import { EventsActions, EventsSelectors } from '@app/store/events';
import { MembersActions, MembersSelectors } from '@app/store/members';

import { StoreRequestService } from './store-request.service';

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  private readonly dialogService = inject(DialogService);
  private readonly store = inject(Store);
  private readonly storeRequests = inject(StoreRequestService);

  public exportEvents(): Promise<void> {
    return this.confirmExport(
      'events',
      EventsSelectors.selectTotalCount,
      EventsActions.exportEventsToCsvRequested(),
      [EventsActions.exportEventsToCsvSucceeded, EventsActions.exportEventsToCsvFailed],
    );
  }

  public exportMembers(): Promise<void> {
    return this.confirmExport(
      'members',
      MembersSelectors.selectTotalCount,
      MembersActions.exportMembersToCsvRequested(),
      [
        MembersActions.exportMembersToCsvSucceeded,
        MembersActions.exportMembersToCsvFailed,
      ],
    );
  }

  private async confirmExport(
    records: 'events' | 'members',
    selectCount: MemoizedSelector<object, number>,
    request: Action,
    outcomes: [ActionCreator, ...ActionCreator[]],
  ): Promise<void> {
    const count = await firstValueFrom(this.store.select(selectCount));

    if (!count) {
      return;
    }

    const dialog: Dialog = {
      title: 'Confirm',
      body: `Export all ${count} ${records} to a CSV file?`,
      confirmButtonText: 'Export',
      confirmButtonType: 'primary',
      confirmAction: () => this.storeRequests.dispatch(request, outcomes),
    };

    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;
  }
}
