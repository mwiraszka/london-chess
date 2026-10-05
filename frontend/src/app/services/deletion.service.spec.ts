import { DialogRef, DialogService } from '@eagami/ui';
import { Action } from '@ngrx/store';

import { TestBed } from '@angular/core/testing';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { MOCK_TOURNAMENTS } from '@app/mocks/tournaments.mock';
import { BasicDialogResult } from '@app/models';
import { ArticlesActions } from '@app/store/articles';
import { EventsActions } from '@app/store/events';
import { ImagesActions } from '@app/store/images';
import { MembersActions } from '@app/store/members';
import { TournamentsActions } from '@app/store/tournaments';
import { closedDialogRef, formatDateRange, lastOpenedDialog } from '@app/utils';

import { DeletionService } from './deletion.service';
import { StoreRequestService } from './store-request.service';

describe('DeletionService', () => {
  let service: DeletionService;
  let dialogOpenSpy: MockInstance;
  let storeRequestSpy: MockInstance;

  const [article] = MOCK_ARTICLES;
  const [event] = MOCK_EVENTS;
  const [image] = MOCK_IMAGES;
  const [member] = MOCK_MEMBERS;
  const [tournament] = MOCK_TOURNAMENTS;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        { provide: StoreRequestService, useValue: { dispatch: vi.fn() } },
      ],
    });

    service = TestBed.inject(DeletionService);
    dialogOpenSpy = vi.spyOn(TestBed.inject(DialogService), 'open');
    storeRequestSpy = vi.spyOn(TestBed.inject(StoreRequestService), 'dispatch');
  });

  describe.each([
    {
      record: 'an article',
      deleteRecord: () => service.deleteArticle(article),
      body: `Delete ${article.title}?`,
      request: ArticlesActions.deleteArticleRequested({ article }),
      succeeded: ArticlesActions.deleteArticleSucceeded,
      failed: ArticlesActions.deleteArticleFailed,
    },
    {
      record: 'an event',
      deleteRecord: () => service.deleteEvent(event),
      body: `Delete ${event.title}?`,
      request: EventsActions.deleteEventRequested({ event }),
      succeeded: EventsActions.deleteEventSucceeded,
      failed: EventsActions.deleteEventFailed,
    },
    {
      record: 'an image',
      deleteRecord: () => service.deleteImage(image),
      body: `Delete ${image.filename}?`,
      request: ImagesActions.deleteImageRequested({ image }),
      succeeded: ImagesActions.deleteImageSucceeded,
      failed: ImagesActions.deleteImageFailed,
    },
    {
      record: 'an album',
      deleteRecord: () => service.deleteAlbum(image.album, '3 photos'),
      body: `Delete ${image.album} and its 3 photos?`,
      request: ImagesActions.deleteAlbumRequested({ album: image.album }),
      succeeded: ImagesActions.deleteAlbumSucceeded,
      failed: ImagesActions.deleteAlbumFailed,
    },
    {
      record: 'a member',
      deleteRecord: () => service.deleteMember(member),
      body: `Delete ${member.firstName} ${member.lastName}?`,
      request: MembersActions.deleteMemberRequested({ member }),
      succeeded: MembersActions.deleteMemberSucceeded,
      failed: MembersActions.deleteMemberFailed,
    },
    {
      record: 'a tournament',
      deleteRecord: () => service.deleteTournament(tournament),
      body: `Delete ${tournament.name} (${formatDateRange(tournament.date, tournament.endDate)})? Its results and registrations will be lost.`,
      request: TournamentsActions.deleteTournamentRequested({
        tournamentNumber: tournament.number,
        tournamentName: tournament.name,
      }),
      succeeded: TournamentsActions.deleteTournamentSucceeded,
      failed: TournamentsActions.deleteTournamentFailed,
    },
  ])('deleting $record', ({ deleteRecord, body, request, succeeded, failed }) => {
    // The dialog runs its confirm action before it closes
    const confirmWith = (outcome: Action) => {
      storeRequestSpy.mockResolvedValue(outcome);
      dialogOpenSpy.mockImplementation(() => {
        const dialogRef = new DialogRef<BasicDialogResult>();
        queueMicrotask(async () => {
          await lastOpenedDialog(dialogOpenSpy).confirmAction?.();
          dialogRef.close('confirm');
        });
        return dialogRef;
      });
    };

    it('should ask first, warning that it is a deletion', async () => {
      await deleteRecord();

      expect(dialogOpenSpy).toHaveBeenCalledExactlyOnceWith(BasicDialogComponent, {
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          }),
        },
      });
      expect(storeRequestSpy).not.toHaveBeenCalled();
    });

    it('should delete the record once the dialog is confirmed', async () => {
      await deleteRecord();

      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(storeRequestSpy).toHaveBeenCalledExactlyOnceWith(request, [
        succeeded,
        failed,
      ]);
    });

    it('should report a deletion that went through', async () => {
      confirmWith({ type: succeeded.type });

      expect(await deleteRecord()).toBe(true);
    });

    it('should report a deletion that failed', async () => {
      confirmWith({ type: failed.type });

      expect(await deleteRecord()).toBe(false);
    });

    it('should report a deletion that was called off', async () => {
      expect(await deleteRecord()).toBe(false);
    });
  });
});
