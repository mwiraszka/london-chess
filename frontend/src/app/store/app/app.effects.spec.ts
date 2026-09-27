import { ToastService } from '@eagami/ui';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { LccError, MemberEmail, Toast } from '@app/models';
import { ArticlesActions } from '@app/store/articles';
import { AuthSelectors } from '@app/store/auth';
import { EventsActions } from '@app/store/events';
import { GamesActions } from '@app/store/games';
import { ImagesActions } from '@app/store/images';
import { MembersActions } from '@app/store/members';
import { NavActions } from '@app/store/nav';

import { environment } from '@env';

import { AppActions, AppSelectors } from '.';
import { AppEffects } from './app.effects';

type ToastType = Toast['type'];

describe('AppEffects', () => {
  let effects: AppEffects;
  let actions$: ReplaySubject<Action>;
  let store: MockStore;
  let toastService: Mocked<ToastService>;

  const mockError: LccError = {
    name: 'LCCError',
    message: 'Test error message',
    status: 500,
  };
  const article = MOCK_ARTICLES[0];
  const event = MOCK_EVENTS[0];
  const image = MOCK_IMAGES[0];
  const member = MOCK_MEMBERS[0];
  const memberName = `${member.firstName} ${member.lastName}`;

  function collect<T>(effect$: Observable<T>): T[] {
    const results: T[] = [];
    effect$.subscribe(action => results.push(action));
    return results;
  }

  function notify(action: Action): Toast | undefined {
    toastService.show.mockClear();
    actions$.next(action);
    const displayed: Array<ReturnType<typeof AppActions.toastDisplayed>> = [];
    effects.notify$.subscribe(result => displayed.push(result)).unsubscribe();

    expect(displayed.length).toBeLessThanOrEqual(1);
    const toast = displayed[0]?.toast;
    if (toast) {
      expect(toastService.show).toHaveBeenCalledExactlyOnceWith(toast.message, {
        title: toast.title,
        variant: toast.type,
      });
    } else {
      expect(toastService.show).not.toHaveBeenCalled();
    }
    return toast;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppEffects,
        provideMockActions(() => actions$),
        { provide: ToastService, useValue: { show: vi.fn() } },
        provideMockStore(),
      ],
    });

    effects = TestBed.inject(AppEffects);
    toastService = TestBed.inject(ToastService) as Mocked<ToastService>;
    store = TestBed.inject(MockStore);
    actions$ = new ReplaySubject<Action>(1);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('notify$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectIsAdmin, true);
      store.refreshState();
    });

    const failures: Action[] = [
      AppActions.unexpectedErrorOccurred({ error: mockError }),
      ArticlesActions.deleteArticleFailed({ error: mockError }),
      ArticlesActions.fetchArticleFailed({ error: mockError }),
      ArticlesActions.fetchFilteredArticlesFailed({ error: mockError }),
      ArticlesActions.fetchHomePageArticlesFailed({ error: mockError }),
      ArticlesActions.publishArticleFailed({ error: mockError }),
      ArticlesActions.updateArticleFailed({ error: mockError }),
      EventsActions.addEventFailed({ error: mockError }),
      EventsActions.deleteEventFailed({ error: mockError }),
      EventsActions.exportEventsToCsvFailed({ error: mockError }),
      EventsActions.fetchEventFailed({ error: mockError }),
      EventsActions.fetchFilteredEventsFailed({ error: mockError }),
      EventsActions.fetchHomePageEventsFailed({ error: mockError }),
      EventsActions.updateEventFailed({ error: mockError }),
      GamesActions.fetchArchiveReferenceFailed({ error: mockError }),
      GamesActions.fetchFilteredGamesFailed({ error: mockError }),
      GamesActions.fetchGameFailed({ error: mockError }),
      ImagesActions.addImageFailed({ error: mockError }),
      ImagesActions.addImagesFailed({ error: mockError }),
      ImagesActions.automaticAlbumCoverSwitchFailed({ album: 'Club', error: mockError }),
      ImagesActions.deleteAlbumFailed({ album: 'Club', error: mockError }),
      ImagesActions.deleteImageFailed({ image, error: mockError }),
      ImagesActions.fetchAllImagesMetadataFailed({ error: mockError }),
      ImagesActions.fetchBatchThumbnailsFailed({ error: mockError }),
      ImagesActions.fetchFilteredThumbnailsFailed({ error: mockError }),
      ImagesActions.fetchMainImageFailed({ error: mockError }),
      ImagesActions.imageFileActionFailed({ error: mockError }),
      ImagesActions.updateAlbumFailed({ album: 'Club', error: mockError }),
      ImagesActions.updateImageFailed({ baseImage: image, error: mockError }),
      MembersActions.addMemberFailed({ error: mockError }),
      MembersActions.deleteMemberFailed({ error: mockError }),
      MembersActions.exportMembersToCsvFailed({ error: mockError }),
      MembersActions.fetchMemberFailed({ error: mockError }),
      MembersActions.fetchAllMembersFailed({ error: mockError }),
      MembersActions.fetchFilteredMembersFailed({ error: mockError }),
      MembersActions.parseMemberRatingsFromCsvFailed({ error: mockError }),
      MembersActions.updateMemberFailed({ error: mockError }),
      MembersActions.updateMemberRatingsFailed({ error: mockError }),
    ];

    it.each(failures.map(action => [action.type, action]))(
      'should show a warning with the error for "%s"',
      (_type, action) => {
        const toast = notify(action);

        expect(toast?.type).toBe('warning');
        expect(toast?.title).toBeTruthy();
        expect(toast?.message).toContain(mockError.message);
        expect(console.error).toHaveBeenCalledWith('[LCC]', mockError);
      },
    );

    const successes: Array<[Action, ToastType, string]> = [
      [
        ArticlesActions.deleteArticleSucceeded({
          articleId: 'a1',
          articleTitle: 'Opening',
        }),
        'success',
        'Opening',
      ],
      [ArticlesActions.publishArticleSucceeded({ article }), 'success', article.title],
      [
        ArticlesActions.updateArticleSucceeded({ article, originalArticleTitle: 'Old' }),
        'success',
        'Old',
      ],
      [EventsActions.addEventSucceeded({ event }), 'success', event.title],
      [
        EventsActions.deleteEventSucceeded({ eventId: 'e1', eventTitle: 'Blitz' }),
        'success',
        'Blitz',
      ],
      [EventsActions.exportEventsToCsvSucceeded({ exportedCount: 17 }), 'success', '17'],
      [
        EventsActions.updateEventSucceeded({ event, originalEventTitle: 'Rapid' }),
        'success',
        'Rapid',
      ],
      [ImagesActions.addImageSucceeded({ image }), 'success', image.filename],
      [ImagesActions.addImagesSucceeded({ images: [image] }), 'success', '1'],
      [
        ImagesActions.addImagesSucceeded({ images: MOCK_IMAGES }),
        'success',
        String(MOCK_IMAGES.length),
      ],
      [
        ImagesActions.automaticAlbumCoverSwitchSucceeded({ baseImage: image }),
        'info',
        image.filename,
      ],
      [
        ImagesActions.deleteAlbumSucceeded({ album: 'Club', imageIds: ['i1'] }),
        'success',
        'Club',
      ],
      [
        ImagesActions.deleteAlbumSucceeded({
          album: 'Club',
          imageIds: ['i1', 'i2', 'i3'],
        }),
        'success',
        '3',
      ],
      [ImagesActions.deleteImageSucceeded({ image }), 'success', image.filename],
      [
        ImagesActions.updateAlbumSucceeded({
          album: 'Club',
          newImages: [],
          updatedImages: [],
        }),
        'success',
        'Club',
      ],
      [
        ImagesActions.updateImageSucceeded({ baseImage: image }),
        'success',
        image.filename,
      ],
      [
        MembersActions.addMemberSucceeded({ member, emailSent: null }),
        'success',
        memberName,
      ],
      [
        MembersActions.deleteMemberSucceeded({ memberId: 'm1', memberName: 'Jo Smith' }),
        'success',
        'Jo Smith',
      ],
      [
        MembersActions.exportMembersToCsvSucceeded({ exportedCount: 23 }),
        'success',
        '23',
      ],
      [
        MembersActions.updateMemberRatingsSucceeded({
          members: MOCK_MEMBERS,
          unnotifiedMemberNames: [],
        }),
        'success',
        String(MOCK_MEMBERS.length),
      ],
      [
        MembersActions.updateMemberRatingsSucceeded({
          members: MOCK_MEMBERS,
          unnotifiedMemberNames: ['Jo Smith', 'Al Brown'],
        }),
        'warning',
        'Jo Smith, Al Brown',
      ],
      [NavActions.pageAccessDenied({ pageHeading: 'Members' }), 'info', 'Members'],
    ];

    it.each(
      successes.map(([action, type, detail]) => [action.type, action, type, detail]),
    )('should show a toast describing "%s"', (_type, action, type, detail) => {
      const toast = notify(action);

      expect(toast?.type).toBe(type);
      expect(toast?.title).toBeTruthy();
      expect(toast?.message).toContain(detail);
    });

    it('should describe album and upload counts differently for one image and many', () => {
      const messageFor = (action: Action): string | undefined => notify(action)?.message;

      expect(messageFor(ImagesActions.addImagesSucceeded({ images: [image] }))).not.toBe(
        messageFor(ImagesActions.addImagesSucceeded({ images: [image, image] })),
      );
      expect(
        messageFor(
          ImagesActions.deleteAlbumSucceeded({ album: 'Club', imageIds: ['a'] }),
        ),
      ).not.toBe(
        messageFor(
          ImagesActions.deleteAlbumSucceeded({ album: 'Club', imageIds: ['a', 'b'] }),
        ),
      );
    });

    it('should say which email, if any, went out with a member change', () => {
      const messages = (
        ['welcome', 'changes', null] as Array<MemberEmail | null>
      ).flatMap(emailSent =>
        [
          MembersActions.updateMemberSucceeded({
            member,
            originalMemberName: memberName,
            emailSent,
          }),
          MembersActions.addMemberSucceeded({ member, emailSent }),
        ].map(action => notify(action)?.message),
      );

      messages.forEach(message => expect(message).toContain(memberName));
      const [updateWelcome, addWelcome, updateChanges, addChanges, updateNone, addNone] =
        messages;
      expect(new Set([updateWelcome, updateChanges, updateNone]).size).toBe(3);
      expect(addWelcome).not.toBe(addNone);
      expect(addChanges).toBe(addNone);
    });

    it('should not toast an action it has no message for', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const toast = effects['mapActionToToast'](ArticlesActions.cancelSelected());

      expect(toast).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        ArticlesActions.cancelSelected.type,
      );
    });

    describe('in production', () => {
      beforeEach(() => {
        (environment as { production: boolean }).production = true;
      });

      afterEach(() => {
        (environment as { production: boolean }).production = false;
      });

      it('should hide load failures from visitors', () => {
        store.overrideSelector(AuthSelectors.selectIsAdmin, false);
        store.refreshState();
        const toast = notify(ArticlesActions.fetchArticleFailed({ error: mockError }));

        expect(toast).toBeUndefined();
      });

      it('should still show load failures to admins', () => {
        const toast = notify(ArticlesActions.fetchArticleFailed({ error: mockError }));

        expect(toast).toBeDefined();
      });

      it('should still show visitors failures of their own changes', () => {
        store.overrideSelector(AuthSelectors.selectIsAdmin, false);
        store.refreshState();
        const toast = notify(ArticlesActions.deleteArticleFailed({ error: mockError }));

        expect(toast).toBeDefined();
      });
    });

    describe('missing records', () => {
      const notFound: LccError = { name: 'LCCError', message: 'Not found', status: 404 };

      it.each([
        ArticlesActions.fetchArticleFailed({ error: notFound }),
        EventsActions.fetchEventFailed({ error: notFound }),
        GamesActions.fetchGameFailed({ error: notFound }),
        MembersActions.fetchMemberFailed({ error: notFound }),
      ])('should not toast a $type for a record that does not exist', action => {
        const toast = notify(action);

        expect(toast).toBeUndefined();
      });

      it('should still toast a 404 from an action that is not a record fetch', () => {
        const toast = notify(ArticlesActions.deleteArticleFailed({ error: notFound }));

        expect(toast?.message).toContain(notFound.message);
      });
    });
  });

  describe('reinstateUpcomingEventBanner$', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-10T12:00:00Z'));
    });

    it('should reinstate the banner once a day has passed since it was cleared', () => {
      store.overrideSelector(
        AppSelectors.selectBannerLastCleared,
        '2026-03-08T12:00:00Z',
      );
      store.refreshState();

      const results = collect(effects.reinstateUpcomingEventBanner$);

      expect(results).toEqual([AppActions.upcomingEventBannerReinstated()]);
    });

    it.each([
      ['cleared today', '2026-03-10T08:00:00Z'],
      ['never cleared', null],
    ])('should leave the banner alone when %s', (_label, bannerLastCleared) => {
      store.overrideSelector(AppSelectors.selectBannerLastCleared, bannerLastCleared);
      store.refreshState();

      const results = collect(effects.reinstateUpcomingEventBanner$);

      expect(results).toEqual([]);
    });
  });
});
