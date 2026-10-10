import { DialogService } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { TestBed } from '@angular/core/testing';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { EventsActions, EventsSelectors } from '@app/store/events';
import { MembersActions, MembersSelectors } from '@app/store/members';
import { closedDialogRef, lastOpenedDialog } from '@app/utils';

import { CsvExportService } from './csv-export.service';
import { StoreRequestService } from './store-request.service';

describe('CsvExportService', () => {
  let service: CsvExportService;
  let store: MockStore;
  let dialogOpenSpy: MockInstance;
  let storeRequestSpy: MockInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        { provide: StoreRequestService, useValue: { dispatch: vi.fn() } },
      ],
    });

    service = TestBed.inject(CsvExportService);
    store = TestBed.inject(MockStore);
    dialogOpenSpy = vi.spyOn(TestBed.inject(DialogService), 'open');
    storeRequestSpy = vi.spyOn(TestBed.inject(StoreRequestService), 'dispatch');

    store.overrideSelector(EventsSelectors.selectTotalCount, 17);
    store.overrideSelector(MembersSelectors.selectTotalCount, 23);
  });

  afterEach(() => store.resetSelectors());

  describe.each([
    {
      records: 'events',
      count: 17,
      selectCount: EventsSelectors.selectTotalCount,
      exportRecords: () => service.exportEvents(),
      request: EventsActions.exportEventsToCsvRequested(),
      outcomes: [
        EventsActions.exportEventsToCsvSucceeded,
        EventsActions.exportEventsToCsvFailed,
      ],
    },
    {
      records: 'members',
      count: 23,
      selectCount: MembersSelectors.selectTotalCount,
      exportRecords: () => service.exportMembers(),
      request: MembersActions.exportMembersToCsvRequested(),
      outcomes: [
        MembersActions.exportMembersToCsvSucceeded,
        MembersActions.exportMembersToCsvFailed,
      ],
    },
  ])(
    'exporting $records',
    ({ records, count, selectCount, exportRecords, request, outcomes }) => {
      it('should ask first, naming how many will be exported', async () => {
        await exportRecords();

        expect(dialogOpenSpy).toHaveBeenCalledExactlyOnceWith(BasicDialogComponent, {
          inputs: {
            dialog: expect.objectContaining({
              title: 'Confirm',
              body: `Export all ${count} ${records} to a CSV file?`,
              confirmButtonText: 'Export',
              confirmButtonType: 'primary',
            }),
          },
        });
        expect(storeRequestSpy).not.toHaveBeenCalled();
      });

      it('should export once the dialog is confirmed', async () => {
        await exportRecords();

        await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

        expect(storeRequestSpy).toHaveBeenCalledExactlyOnceWith(request, outcomes);
      });

      it('should not offer an export when there is nothing to export', async () => {
        store.overrideSelector(selectCount, 0);
        store.refreshState();

        await exportRecords();

        expect(dialogOpenSpy).not.toHaveBeenCalled();
      });
    },
  );
});
