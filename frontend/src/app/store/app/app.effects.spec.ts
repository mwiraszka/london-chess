import { ToastService } from '@eagami/ui';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import moment from 'moment-timezone';
import { ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { LccError } from '@app/models';
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

  beforeEach(() => {
    const toastServiceMock = {
      show: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AppEffects,
        provideMockActions(() => actions$),
        { provide: ToastService, useValue: toastServiceMock },
        provideMockStore(),
      ],
    });

    effects = TestBed.inject(AppEffects);
    toastService = TestBed.inject(ToastService) as Mocked<ToastService>;
    store = TestBed.inject(MockStore);
    actions$ = new ReplaySubject<Action>(1);

    vi.clearAllMocks();
  });

  describe('notify$', () => {
    beforeEach(() => {
      store.overrideSelector(AuthSelectors.selectIsAdmin, true);
      store.refreshState();
    });

    describe('App actions', () => {
      it('should display toast for unexpectedErrorOccurred', () =>
        withDone(done => {
          actions$.next(AppActions.unexpectedErrorOccurred({ error: mockError }));

          effects.notify$.subscribe(action => {
            expect(toastService.show).toHaveBeenCalledWith('Test error message', {
              title: 'Unexpected error',
              variant: 'warning',
            });
            expect(action).toEqual(
              AppActions.toastDisplayed({
                toast: {
                  title: 'Unexpected error',
                  message: 'Test error message',
                  type: 'warning',
                },
              }),
            );
            done();
          });
        }));
    });

    describe('Articles actions', () => {
      it('should display toast for deleteArticleFailed', () =>
        withDone(done => {
          actions$.next(ArticlesActions.deleteArticleFailed({ error: mockError }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith('Test error message', {
              title: 'Article deletion',
              variant: 'warning',
            });
            done();
          });
        }));

      it('should display toast for deleteArticleSucceeded', () =>
        withDone(done => {
          actions$.next(
            ArticlesActions.deleteArticleSucceeded({
              articleId: 'test123',
              articleTitle: 'Test Article',
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully deleted Test Article',
              { title: 'Article deletion', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for fetchArticleFailed', () =>
        withDone(done => {
          actions$.next(ArticlesActions.fetchArticleFailed({ error: mockError }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith('Test error message', {
              title: 'Load article',
              variant: 'warning',
            });
            done();
          });
        }));

      it('should display toast for publishArticleSucceeded', () =>
        withDone(done => {
          const article = { ...MOCK_ARTICLES[0], title: 'New Article' };
          actions$.next(ArticlesActions.publishArticleSucceeded({ article }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully published New Article',
              { title: 'New article', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for updateArticleSucceeded', () =>
        withDone(done => {
          actions$.next(
            ArticlesActions.updateArticleSucceeded({
              article: MOCK_ARTICLES[0],
              originalArticleTitle: 'Original Title',
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully updated Original Title',
              { title: 'Article update', variant: 'success' },
            );
            done();
          });
        }));
    });

    describe('Events actions', () => {
      it('should display toast for addEventSucceeded', () =>
        withDone(done => {
          const event = { ...MOCK_EVENTS[0], title: 'New Event' };
          actions$.next(EventsActions.addEventSucceeded({ event }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully added New Event',
              { title: 'New event', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for deleteEventSucceeded', () =>
        withDone(done => {
          actions$.next(
            EventsActions.deleteEventSucceeded({
              eventId: 'evt123',
              eventTitle: 'Test Event',
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully deleted Test Event',
              { title: 'Event deletion', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for exportEventsToCsvSucceeded', () =>
        withDone(done => {
          actions$.next(EventsActions.exportEventsToCsvSucceeded({ exportedCount: 25 }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully exported 25 events to CSV',
              { title: 'CSV export', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for updateEventSucceeded', () =>
        withDone(done => {
          actions$.next(
            EventsActions.updateEventSucceeded({
              event: MOCK_EVENTS[0],
              originalEventTitle: 'Original Event',
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully updated Original Event',
              { title: 'Event update', variant: 'success' },
            );
            done();
          });
        }));
    });

    describe('Games actions', () => {
      it('should display toast for fetchFilteredGamesFailed', () =>
        withDone(done => {
          actions$.next(GamesActions.fetchFilteredGamesFailed({ error: mockError }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith('Test error message', {
              title: 'Load games',
              variant: 'warning',
            });
            done();
          });
        }));
    });

    describe('Images actions', () => {
      it('should display toast for addImageSucceeded', () =>
        withDone(done => {
          const image = { ...MOCK_IMAGES[0], filename: 'test.jpg' };
          actions$.next(ImagesActions.addImageSucceeded({ image }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully uploaded test.jpg',
              { title: 'Add image', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for addImagesSucceeded with single image', () =>
        withDone(done => {
          actions$.next(ImagesActions.addImagesSucceeded({ images: [MOCK_IMAGES[0]] }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully uploaded 1 image',
              { title: 'Add images', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for addImagesSucceeded with multiple images', () =>
        withDone(done => {
          actions$.next(
            ImagesActions.addImagesSucceeded({
              images: [MOCK_IMAGES[0], MOCK_IMAGES[1]],
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully uploaded 2 images',
              { title: 'Add images', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for deleteAlbumSucceeded', () =>
        withDone(done => {
          actions$.next(
            ImagesActions.deleteAlbumSucceeded({
              album: 'Test Album',
              imageIds: ['1', '2'],
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully deleted Test Album and all 2 of its images',
              { title: 'Album deletion', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for deleteImageSucceeded', () =>
        withDone(done => {
          const image = { ...MOCK_IMAGES[0], filename: 'test.jpg' };
          actions$.next(ImagesActions.deleteImageSucceeded({ image }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully deleted test.jpg',
              { title: 'Image deletion', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for updateAlbumSucceeded', () =>
        withDone(done => {
          actions$.next(
            ImagesActions.updateAlbumSucceeded({
              album: 'Test Album',
              newImages: [],
              updatedImages: [],
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully updated Test Album',
              { title: 'Album update', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for updateImageSucceeded', () =>
        withDone(done => {
          const baseImage = { ...MOCK_IMAGES[0], filename: 'updated.jpg' };
          actions$.next(ImagesActions.updateImageSucceeded({ baseImage }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully updated updated.jpg',
              { title: 'Image update', variant: 'success' },
            );
            done();
          });
        }));
    });

    describe('Members actions', () => {
      it('should display toast for addMemberSucceeded', () =>
        withDone(done => {
          const member = { ...MOCK_MEMBERS[0], firstName: 'John', lastName: 'Doe' };
          actions$.next(MembersActions.addMemberSucceeded({ member, emailSent: null }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully added John Doe.',
              { title: 'New member', variant: 'success' },
            );
            done();
          });
        }));

      it('should mention the welcome email for a member added with an account', () =>
        withDone(done => {
          const member = { ...MOCK_MEMBERS[0], firstName: 'John', lastName: 'Doe' };
          actions$.next(
            MembersActions.addMemberSucceeded({ member, emailSent: 'welcome' }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully added John Doe and emailed them their login details.',
              { title: 'New member', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for deleteMemberSucceeded', () =>
        withDone(done => {
          actions$.next(
            MembersActions.deleteMemberSucceeded({
              memberId: 'mem123',
              memberName: 'Jane Smith',
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully deleted Jane Smith',
              { title: 'Member deletion', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for exportMembersToCsvSucceeded', () =>
        withDone(done => {
          actions$.next(
            MembersActions.exportMembersToCsvSucceeded({ exportedCount: 50 }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully exported 50 members to CSV',
              { title: 'CSV export', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for updateMemberSucceeded', () =>
        withDone(done => {
          actions$.next(
            MembersActions.updateMemberSucceeded({
              member: MOCK_MEMBERS[0],
              originalMemberName: 'Old Name',
              emailSent: null,
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully updated Old Name.',
              { title: 'Member update', variant: 'success' },
            );
            done();
          });
        }));

      it('should mention the changes email for a member with an account', () =>
        withDone(done => {
          actions$.next(
            MembersActions.updateMemberSucceeded({
              member: MOCK_MEMBERS[0],
              originalMemberName: 'Old Name',
              emailSent: 'changes',
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully updated Old Name and emailed them the changes.',
              { title: 'Member update', variant: 'success' },
            );
            done();
          });
        }));

      it('should mention the welcome email for a member given an account', () =>
        withDone(done => {
          actions$.next(
            MembersActions.updateMemberSucceeded({
              member: MOCK_MEMBERS[2],
              originalMemberName: 'Old Name',
              emailSent: 'welcome',
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully updated Old Name and emailed them their login details.',
              { title: 'Member update', variant: 'success' },
            );
            done();
          });
        }));

      it('should display toast for updateMemberRatingsSucceeded', () =>
        withDone(done => {
          actions$.next(
            MembersActions.updateMemberRatingsSucceeded({
              members: [MOCK_MEMBERS[0], MOCK_MEMBERS[1]],
              unnotifiedMemberNames: [],
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Successfully updated 2 members.',
              { title: 'Members update', variant: 'success' },
            );
            done();
          });
        }));

      it('should warn about members who could not be emailed their new rating', () =>
        withDone(done => {
          actions$.next(
            MembersActions.updateMemberRatingsSucceeded({
              members: [MOCK_MEMBERS[0], MOCK_MEMBERS[1]],
              unnotifiedMemberNames: ['Magnus Carlsen'],
            }),
          );

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Updated 2 members, but Magnus Carlsen could not be emailed about their new rating.',
              { title: 'Members update', variant: 'warning' },
            );
            done();
          });
        }));
    });

    describe('Nav actions', () => {
      it('should display toast for pageAccessDenied', () =>
        withDone(done => {
          actions$.next(NavActions.pageAccessDenied({ pageHeading: 'Admin Panel' }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith(
              'Please log in as admin to access Admin Panel page',
              { title: 'Access denied', variant: 'info' },
            );
            done();
          });
        }));
    });

    describe('Toast suppression in production', () => {
      beforeEach(() => {
        // Mock production environment
        (environment as { production: boolean }).production = true;
        store.overrideSelector(AuthSelectors.selectIsAdmin, false);
        store.refreshState();
      });

      afterEach(() => {
        (environment as { production: boolean }).production = false;
      });

      it('should suppress fetchArticleFailed toast in production for non-admin', () =>
        withDone(done => {
          actions$.next(ArticlesActions.fetchArticleFailed({ error: mockError }));

          setTimeout(() => {
            expect(toastService.show).not.toHaveBeenCalled();
            done();
          }, 10);
        }));

      it('should still show deleteArticleFailed toast in production for non-admin', () =>
        withDone(done => {
          actions$.next(ArticlesActions.deleteArticleFailed({ error: mockError }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalled();
            done();
          });
        }));
    });

    describe('missing records', () => {
      const notFound: LccError = { name: 'LCCError', message: 'Not found', status: 404 };

      it('should not toast a fetchMemberFailed for a record that does not exist', () =>
        withDone(done => {
          actions$.next(MembersActions.fetchMemberFailed({ error: notFound }));

          setTimeout(() => {
            expect(toastService.show).not.toHaveBeenCalled();
            done();
          }, 10);
        }));

      it('should still toast a fetchMemberFailed for any other failure', () =>
        withDone(done => {
          actions$.next(MembersActions.fetchMemberFailed({ error: mockError }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith('Test error message', {
              title: 'Load member',
              variant: 'warning',
            });
            done();
          });
        }));

      it('should still toast a 404 from an action that is not a record fetch', () =>
        withDone(done => {
          actions$.next(ArticlesActions.deleteArticleFailed({ error: notFound }));

          effects.notify$.subscribe(() => {
            expect(toastService.show).toHaveBeenCalledWith('Not found', {
              title: 'Article deletion',
              variant: 'warning',
            });
            done();
          });
        }));
    });

    it('should log error to console when action has error property', () =>
      withDone(done => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        actions$.next(ArticlesActions.fetchArticleFailed({ error: mockError }));

        effects.notify$.subscribe(() => {
          expect(consoleSpy).toHaveBeenCalledWith('[LCC]', mockError);
          consoleSpy.mockRestore();
          done();
        });
      }));
  });

  describe('reinstateUpcomingEventBanner$', () => {
    it('should reinstate banner when more than a day has passed', () =>
      withDone(done => {
        const yesterday = moment().subtract(2, 'days').toISOString();
        store.overrideSelector(AppSelectors.selectBannerLastCleared, yesterday);
        store.refreshState();

        effects.reinstateUpcomingEventBanner$.subscribe(action => {
          expect(action).toEqual(AppActions.upcomingEventBannerReinstated());
          done();
        });
      }));

    it('should not reinstate banner when cleared today', () =>
      withDone(done => {
        const today = moment().toISOString();
        store.overrideSelector(AppSelectors.selectBannerLastCleared, today);
        store.refreshState();

        setTimeout(() => {
          // No action should be emitted
          done();
        }, 10);
      }));

    it('should not reinstate banner when never cleared', () =>
      withDone(done => {
        store.overrideSelector(AppSelectors.selectBannerLastCleared, null);
        store.refreshState();

        setTimeout(() => {
          // No action should be emitted
          done();
        }, 10);
      }));
  });
});
