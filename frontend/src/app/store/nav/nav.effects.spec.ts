import { provideMockActions } from '@ngrx/effects/testing';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';

import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { DialogService } from '@app/services';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { EventsActions } from '@app/store/events';
import { GamesActions } from '@app/store/games';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { MembersActions } from '@app/store/members';

import { NavActions, NavSelectors } from '.';
import { NavEffects } from './nav.effects';

describe('NavEffects', () => {
  let actions$: ReplaySubject<Action>;
  let dialogService: Mocked<DialogService>;
  let effects: NavEffects;
  let router: Mocked<Router>;
  let store: MockStore;

  const mockNavigatedAction = (url: string) =>
    routerNavigatedAction({
      payload: {
        event: { url, id: 1, urlAfterRedirects: url },
        routerState: {},
      },
    } as ReturnType<typeof routerNavigatedAction>);

  beforeEach(() => {
    const routerMock = {
      navigate: vi.fn(),
      events: new ReplaySubject<NavigationEnd>(1),
    };

    const dialogServiceMock = {
      closeAll: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        NavEffects,
        provideMockActions(() => actions$),
        { provide: Router, useValue: routerMock },
        { provide: DialogService, useValue: dialogServiceMock },
        provideMockStore({
          initialState: {
            navState: {
              pathHistory: [],
              currentPath: null,
            },
          },
          selectors: [
            { selector: NavSelectors.selectCurrentPath, value: null },
            { selector: ArticlesSelectors.selectArticleById('article123'), value: null },
            { selector: ImagesSelectors.selectImageById('image123'), value: null },
          ],
        }),
      ],
    });

    dialogService = TestBed.inject(DialogService) as Mocked<DialogService>;
    effects = TestBed.inject(NavEffects);
    router = TestBed.inject(Router) as Mocked<Router>;
    store = TestBed.inject(MockStore);
    actions$ = new ReplaySubject<Action>(1);

    router.navigate.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function collect<T>(effect$: Observable<T>): T[] {
    const results: T[] = [];
    effect$.subscribe(action => results.push(action));
    return results;
  }

  describe('appendPathToHistory$', () => {
    it('should append new path to history when path changes', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/members');
        store.refreshState();

        actions$.next(mockNavigatedAction('/schedule'));

        effects.appendPathToHistory$.subscribe(action => {
          expect(action).toEqual(NavActions.appendPathToHistory({ path: '/schedule' }));
          done();
        });
      }));

    it('should ignore fragment differences when comparing paths', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, '/news');
      store.refreshState();
      actions$.next(mockNavigatedAction('/news#section'));

      const results = collect(effects.appendPathToHistory$);

      expect(results).toEqual([]);
    });

    it('should append path when current path is null', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, null);
      store.refreshState();
      actions$.next(mockNavigatedAction('/news'));

      const results = collect(effects.appendPathToHistory$);

      expect(results).toEqual([NavActions.appendPathToHistory({ path: '/news' })]);
    });
  });

  describe('closeAllDialogsOnNavigation$', () => {
    it('should close all dialogs on NavigationEnd event', () =>
      withDone(done => {
        effects.closeAllDialogsOnNavigation$.subscribe(() => {
          expect(dialogService.closeAll).toHaveBeenCalledTimes(1);
          done();
        });

        (router.events as ReplaySubject<NavigationEnd>).next(
          new NavigationEnd(1, '/schedule', '/schedule'),
        );
      }));
  });

  describe('redirectOnAccessDenied$', () => {
    it('should navigate to current path on access denied', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, '/members');
      store.refreshState();

      effects.redirectOnAccessDenied$.subscribe();
      actions$.next(NavActions.pageAccessDenied({ pageHeading: 'Members' }));

      expect(router.navigate).toHaveBeenCalledWith(['/members']);
    });

    it('should navigate to home when current path is null', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, null);
      store.refreshState();

      effects.redirectOnAccessDenied$.subscribe();
      actions$.next(NavActions.pageAccessDenied({ pageHeading: 'Admin' }));

      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('navigate$', () => {
    it('should navigate internally for relative paths', () => {
      effects.navigate$.subscribe();
      actions$.next(NavActions.navigationRequested({ path: 'members' }));

      expect(router.navigate).toHaveBeenCalledWith(['members']);
    });

    it('should open external links with www in new tab', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      effects.navigate$.subscribe();
      actions$.next(NavActions.navigationRequested({ path: 'www.example.com/page' }));

      expect(openSpy).toHaveBeenCalledWith('www.example.com/page', '_blank');
      expect(router.navigate).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('should open external links with http in new tab', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      effects.navigate$.subscribe();
      actions$.next(NavActions.navigationRequested({ path: 'https://example.com/page' }));

      expect(openSpy).toHaveBeenCalledWith('https://example.com/page', '_blank');
      expect(router.navigate).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });
  });

  describe('navigateToMembers$', () => {
    it('should navigate to members on cancelSelected', () =>
      withDone(done => {
        actions$.next(MembersActions.cancelSelected());

        effects.navigateToMembers$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: 'members' }));
          done();
        });
      }));

    it('should navigate to members on addMemberSucceeded', () =>
      withDone(done => {
        actions$.next(
          MembersActions.addMemberSucceeded({
            member: MOCK_MEMBERS[0],
            emailSent: null,
          }),
        );

        effects.navigateToMembers$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: 'members' }));
          done();
        });
      }));

    it('should navigate to members on updateMemberSucceeded', () =>
      withDone(done => {
        actions$.next(
          MembersActions.updateMemberSucceeded({
            member: MOCK_MEMBERS[0],
            originalMemberName: 'John Doe',
            emailSent: null,
          }),
        );

        effects.navigateToMembers$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: 'members' }));
          done();
        });
      }));
  });

  describe('leaveMissingRecord$', () => {
    const failed = { name: 'LCCError' as const, message: 'Failed' };
    const notFound = { name: 'LCCError' as const, message: 'Not found', status: 404 };

    it.each([
      ['an article', ArticlesActions.fetchArticleFailed],
      ['an event', EventsActions.fetchEventFailed],
      ['a game', GamesActions.fetchGameFailed],
      ['a member', MembersActions.fetchMemberFailed],
    ])('should navigate home when %s does not exist', (_, fetchFailed) =>
      withDone(done => {
        actions$.next(fetchFailed({ error: notFound }));

        effects.leaveMissingRecord$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: '/' }));
          done();
        });
      }),
    );

    it.each([
      ['an article', ArticlesActions.fetchArticleFailed],
      ['an event', EventsActions.fetchEventFailed],
      ['a game', GamesActions.fetchGameFailed],
      ['a member', MembersActions.fetchMemberFailed],
    ])(
      'should stay on the page when %s fails to load for another reason',
      (_, fetchFailed) => {
        const emitted: Action[] = [];
        effects.leaveMissingRecord$.subscribe(action => emitted.push(action));

        actions$.next(fetchFailed({ error: failed }));

        expect(emitted).toEqual([]);
      },
    );
  });

  describe('navigateToSchedule$', () => {
    it('should navigate to schedule on cancelSelected', () =>
      withDone(done => {
        actions$.next(EventsActions.cancelSelected());

        effects.navigateToSchedule$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: 'schedule' }));
          done();
        });
      }));

    it('should navigate to schedule on addEventSucceeded', () =>
      withDone(done => {
        actions$.next(EventsActions.addEventSucceeded({ event: MOCK_EVENTS[0] }));

        effects.navigateToSchedule$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: 'schedule' }));
          done();
        });
      }));

    it('should navigate to schedule on updateEventSucceeded', () =>
      withDone(done => {
        actions$.next(
          EventsActions.updateEventSucceeded({
            event: MOCK_EVENTS[0],
            originalEventTitle: 'Old Test',
          }),
        );

        effects.navigateToSchedule$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: 'schedule' }));
          done();
        });
      }));
  });

  describe('navigateToNews$', () => {
    it('should navigate to news on cancelSelected', () =>
      withDone(done => {
        actions$.next(ArticlesActions.cancelSelected());

        effects.navigateToNews$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: 'news' }));
          done();
        });
      }));

    it('should navigate to news on publishArticleSucceeded', () =>
      withDone(done => {
        actions$.next(
          ArticlesActions.publishArticleSucceeded({
            article: MOCK_ARTICLES[0],
          }),
        );

        effects.navigateToNews$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: 'news' }));
          done();
        });
      }));

    it('should navigate to news on updateArticleSucceeded', () =>
      withDone(done => {
        actions$.next(
          ArticlesActions.updateArticleSucceeded({
            article: MOCK_ARTICLES[0],
            originalArticleTitle: 'Old Title',
          }),
        );

        effects.navigateToNews$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: 'news' }));
          done();
        });
      }));
  });

  describe('navigateToNewsAfterArticleDeletion$', () => {
    it('should navigate to news when viewing deleted article', () =>
      withDone(done => {
        const articleId = 'article123';
        store.overrideSelector(
          NavSelectors.selectCurrentPath,
          `/article/view/${articleId}`,
        );
        store.refreshState();

        actions$.next(
          ArticlesActions.deleteArticleSucceeded({ articleId, articleTitle: 'Test' }),
        );

        effects.navigateToNewsAfterArticleDeletion$.subscribe(action => {
          expect(action).toEqual(NavActions.navigationRequested({ path: 'news' }));
          done();
        });
      }));

    it('should not navigate when not viewing the deleted article', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, '/news');
      store.refreshState();
      actions$.next(
        ArticlesActions.deleteArticleSucceeded({
          articleId: 'article123',
          articleTitle: 'Test',
        }),
      );

      const results = collect(effects.navigateToNewsAfterArticleDeletion$);

      expect(results).toEqual([]);
    });
  });

  describe('navigateToPhotoGallery$', () => {
    it('should navigate to photo-gallery on cancelSelected', () =>
      withDone(done => {
        actions$.next(ImagesActions.cancelSelected());

        effects.navigateToPhotoGallery$.subscribe(action => {
          expect(action).toEqual(
            NavActions.navigationRequested({ path: 'photo-gallery' }),
          );
          done();
        });
      }));

    it('should navigate to photo-gallery on addImageSucceeded', () =>
      withDone(done => {
        actions$.next(ImagesActions.addImageSucceeded({ image: MOCK_IMAGES[0] }));

        effects.navigateToPhotoGallery$.subscribe(action => {
          expect(action).toEqual(
            NavActions.navigationRequested({ path: 'photo-gallery' }),
          );
          done();
        });
      }));

    it('should navigate to photo-gallery on addImagesSucceeded', () =>
      withDone(done => {
        actions$.next(ImagesActions.addImagesSucceeded({ images: [MOCK_IMAGES[0]] }));

        effects.navigateToPhotoGallery$.subscribe(action => {
          expect(action).toEqual(
            NavActions.navigationRequested({ path: 'photo-gallery' }),
          );
          done();
        });
      }));

    it('should navigate to photo-gallery on updateImageSucceeded', () =>
      withDone(done => {
        actions$.next(
          ImagesActions.updateImageSucceeded({
            baseImage: MOCK_IMAGES[0],
          }),
        );

        effects.navigateToPhotoGallery$.subscribe(action => {
          expect(action).toEqual(
            NavActions.navigationRequested({ path: 'photo-gallery' }),
          );
          done();
        });
      }));

    it('should navigate to photo-gallery on updateAlbumSucceeded', () =>
      withDone(done => {
        actions$.next(
          ImagesActions.updateAlbumSucceeded({
            album: 'Test Album',
            newImages: [],
            updatedImages: [],
          }),
        );

        effects.navigateToPhotoGallery$.subscribe(action => {
          expect(action).toEqual(
            NavActions.navigationRequested({ path: 'photo-gallery' }),
          );
          done();
        });
      }));
  });

  describe('handleEntityRouteNavigationRequest$', () => {
    it('should leave an article view to the guard on its route', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, '/news');
      store.refreshState();
      const emitted: Action[] = [];
      effects.handleEntityRouteNavigationRequest$.subscribe(action =>
        emitted.push(action),
      );

      actions$.next(mockNavigatedAction('/article/view/a7b8c9d0e1f2a3b4c5d6e7f8'));

      expect(emitted).toEqual([]);
    });

    it('should fetch article when navigating to article edit', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/news');
        store.refreshState();

        actions$.next(mockNavigatedAction('/article/edit/a7b8c9d0e1f2a3b4c5d6e7f8'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(
            ArticlesActions.fetchArticleRequested({
              articleId: 'a7b8c9d0e1f2a3b4c5d6e7f8',
            }),
          );
          done();
        });
      }));

    it('should select createAnArticle when navigating to article add', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/news');
        store.refreshState();

        actions$.next(mockNavigatedAction('/article/add'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(ArticlesActions.createAnArticleSelected());
          done();
        });
      }));

    it('should fetch event when navigating to event edit', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/schedule');
        store.refreshState();

        actions$.next(mockNavigatedAction('/event/edit/a7b8c9d0e1f2a3b4c5d6e7f8'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.fetchEventRequested({ eventId: 'a7b8c9d0e1f2a3b4c5d6e7f8' }),
          );
          done();
        });
      }));

    it('should select addAnEvent when navigating to event add', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/schedule');
        store.refreshState();

        actions$.next(mockNavigatedAction('/event/add'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(EventsActions.addAnEventSelected());
          done();
        });
      }));

    it('should fetch member when navigating to member edit', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/members');
        store.refreshState();

        actions$.next(mockNavigatedAction('/member/edit/a7b8c9d0e1f2a3b4c5d6e7f8'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.fetchMemberRequested({ memberId: 'a7b8c9d0e1f2a3b4c5d6e7f8' }),
          );
          done();
        });
      }));

    it('should select addAMember when navigating to member add', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/members');
        store.refreshState();

        actions$.next(mockNavigatedAction('/member/add'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(MembersActions.addAMemberSelected());
          done();
        });
      }));

    it('should fetch image when navigating to image edit', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/photo-gallery');
        store.refreshState();

        actions$.next(mockNavigatedAction('/image/edit/a7b8c9d0e1f2a3b4c5d6e7f8'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchMainImageRequested({
              imageId: 'a7b8c9d0e1f2a3b4c5d6e7f8',
            }),
          );
          done();
        });
      }));

    it('should select addAnImage when navigating to image add', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/photo-gallery');
        store.refreshState();

        actions$.next(mockNavigatedAction('/image/add'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(ImagesActions.addAnImageSelected());
          done();
        });
      }));

    it('should fetch album thumbnails when navigating to album edit', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/photo-gallery');
        store.refreshState();

        actions$.next(mockNavigatedAction('/album/edit/Test%20Album'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchAlbumThumbnailsRequested({ album: 'Test Album' }),
          );
          done();
        });
      }));

    it('should fetch album thumbnails when navigating to album view', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/photo-gallery');
        store.refreshState();

        actions$.next(mockNavigatedAction('/album/view/Test%20Album'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.fetchAlbumThumbnailsRequested({ album: 'Test Album' }),
          );
          done();
        });
      }));

    it('should select createAnAlbum when navigating to album add', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/photo-gallery');
        store.refreshState();

        actions$.next(mockNavigatedAction('/album/add'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(ImagesActions.createAnAlbumSelected());
          done();
        });
      }));

    it.each([
      ['/article/edit/not-an-id', 'news'],
      ['/article/unknown', 'news'],
      ['/event/edit/not-an-id', 'schedule'],
      ['/image/edit/not-an-id', 'photo-gallery'],
      ['/member/view/a7b8c9d0e1f2a3b4c5d6e7f8', 'members'],
    ])('should send an invalid %s route back to %s', (url, path) => {
      actions$.next(mockNavigatedAction(url));

      const results = collect(effects.handleEntityRouteNavigationRequest$);

      expect(results).toEqual([NavActions.navigationRequested({ path })]);
    });

    it('should only handle a record route once when just its fragment changes', () => {
      const results = collect(effects.handleEntityRouteNavigationRequest$);

      actions$.next(mockNavigatedAction('/article/add'));
      actions$.next(mockNavigatedAction('/article/add#body'));

      expect(results).toEqual([ArticlesActions.createAnArticleSelected()]);
    });

    it('should navigate to photo-gallery for invalid album route', () =>
      withDone(done => {
        store.overrideSelector(NavSelectors.selectCurrentPath, '/photo-gallery');
        store.refreshState();

        actions$.next(mockNavigatedAction('/album/invalid'));

        effects.handleEntityRouteNavigationRequest$.subscribe(action => {
          expect(action).toEqual(
            NavActions.navigationRequested({ path: 'photo-gallery' }),
          );
          done();
        });
      }));
  });

  describe('restoreFormDataOnNavigationAwayFromEntityRoute$', () => {
    it('should restore article form data when navigating away from article route', () =>
      withDone(done => {
        store.overrideSelector(
          NavSelectors.selectCurrentPath,
          '/article/edit/a7b8c9d0e1f2a3b4c5d6e7f8',
        );
        store.refreshState();

        actions$.next(mockNavigatedAction('/news'));

        effects.restoreFormDataOnNavigationAwayFromEntityRoute$.subscribe(action => {
          expect(action).toEqual(
            ArticlesActions.formDataRestored({ articleId: 'a7b8c9d0e1f2a3b4c5d6e7f8' }),
          );
          done();
        });
      }));

    it('should restore event form data when navigating away from event route', () =>
      withDone(done => {
        store.overrideSelector(
          NavSelectors.selectCurrentPath,
          '/event/edit/a7b8c9d0e1f2a3b4c5d6e7f8',
        );
        store.refreshState();

        actions$.next(mockNavigatedAction('/schedule'));

        effects.restoreFormDataOnNavigationAwayFromEntityRoute$.subscribe(action => {
          expect(action).toEqual(
            EventsActions.formDataRestored({ eventId: 'a7b8c9d0e1f2a3b4c5d6e7f8' }),
          );
          done();
        });
      }));

    it('should restore member form data when navigating away from member route', () =>
      withDone(done => {
        store.overrideSelector(
          NavSelectors.selectCurrentPath,
          '/member/edit/a7b8c9d0e1f2a3b4c5d6e7f8',
        );
        store.refreshState();

        actions$.next(mockNavigatedAction('/members'));

        effects.restoreFormDataOnNavigationAwayFromEntityRoute$.subscribe(action => {
          expect(action).toEqual(
            MembersActions.formDataRestored({ memberId: 'a7b8c9d0e1f2a3b4c5d6e7f8' }),
          );
          done();
        });
      }));

    it('should restore image form data when navigating away from image route', () =>
      withDone(done => {
        store.overrideSelector(
          NavSelectors.selectCurrentPath,
          '/image/edit/a7b8c9d0e1f2a3b4c5d6e7f8',
        );
        store.refreshState();

        actions$.next(mockNavigatedAction('/photo-gallery'));

        effects.restoreFormDataOnNavigationAwayFromEntityRoute$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.imageFormDataRestored({ imageId: 'a7b8c9d0e1f2a3b4c5d6e7f8' }),
          );
          done();
        });
      }));

    it('should restore album form data when navigating away from album route', () =>
      withDone(done => {
        store.overrideSelector(
          NavSelectors.selectCurrentPath,
          '/album/edit/Test%20Album',
        );
        store.refreshState();

        actions$.next(mockNavigatedAction('/photo-gallery'));

        effects.restoreFormDataOnNavigationAwayFromEntityRoute$.subscribe(action => {
          expect(action).toEqual(
            ImagesActions.albumFormDataRestored({ album: 'Test%20Album' }),
          );
          done();
        });
      }));

    it('should not restore form data when staying on same entity type', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, '/article/edit/abc123');
      store.refreshState();
      actions$.next(mockNavigatedAction('/article/view/def456'));

      const results = collect(effects.restoreFormDataOnNavigationAwayFromEntityRoute$);

      expect(results).toEqual([]);
    });

    it('should not restore form data when leaving a page that is not a record', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, '/news');
      store.refreshState();
      actions$.next(mockNavigatedAction('/members'));

      const results = collect(effects.restoreFormDataOnNavigationAwayFromEntityRoute$);

      expect(results).toEqual([]);
    });

    it('should restore new record form data when leaving an add page', () => {
      store.overrideSelector(NavSelectors.selectCurrentPath, '/member/add');
      store.refreshState();
      actions$.next(mockNavigatedAction('/members'));

      const results = collect(effects.restoreFormDataOnNavigationAwayFromEntityRoute$);

      expect(results).toEqual([MembersActions.formDataRestored({ memberId: null })]);
    });
  });
});
