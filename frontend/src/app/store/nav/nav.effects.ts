import { DialogService } from '@eagami/ui';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Action, Store } from '@ngrx/store';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { Entity } from '@app/models';
import * as ArticlesActions from '@app/store/articles/articles.actions';
import * as EventsActions from '@app/store/events/events.actions';
import * as GamesActions from '@app/store/games/games.actions';
import * as ImagesActions from '@app/store/images/images.actions';
import * as MembersActions from '@app/store/members/members.actions';
import * as TournamentsActions from '@app/store/tournaments/tournaments.actions';
import {
  isCollectionId,
  isDefined,
  isEntity,
  isRecordNumber,
  isString,
} from '@app/utils';

import * as NavActions from './nav.actions';
import * as NavSelectors from './nav.selectors';

const RECORD_FETCH_FAILURES = [
  ArticlesActions.fetchArticleFailed,
  EventsActions.fetchEventFailed,
  GamesActions.fetchGameFailed,
  MembersActions.fetchMemberFailed,
  TournamentsActions.fetchTournamentFailed,
] as const;

function isMissingRecord(action: ReturnType<(typeof RECORD_FETCH_FAILURES)[number]>) {
  return action.error.status === 404;
}

@Injectable()
export class NavEffects {
  private readonly actions$ = inject(Actions);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  appendPathToHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(routerNavigatedAction),
      map(({ payload }) => payload.event.url),
      concatLatestFrom(() => this.store.select(NavSelectors.selectCurrentPath)),
      filter(
        ([requestedPath, currentPath]) =>
          requestedPath.split('#')[0] !== currentPath?.split('#')[0],
      ),
      map(([path]) => NavActions.appendPathToHistory({ path })),
    ),
  );

  closeAllDialogsOnNavigation$ = createEffect(
    () =>
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        tap(() => this.dialogService.closeAll()),
      ),
    { dispatch: false },
  );

  redirectOnAccessDenied$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(NavActions.pageAccessDenied),
        concatLatestFrom(() => this.store.select(NavSelectors.selectCurrentPath)),
        tap(([, currentPath]) => this.router.navigate([currentPath ?? '/'])),
      ),
    { dispatch: false },
  );

  navigate$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(NavActions.navigationRequested),
        tap(({ path }) => {
          if (path.includes('www.') || path.includes('http')) {
            window.open(path, '_blank');
          } else {
            this.router.navigate([path]);
          }
        }),
      ),
    { dispatch: false },
  );

  navigateToMembers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        MembersActions.cancelSelected,
        MembersActions.addMemberSucceeded,
        MembersActions.updateMemberSucceeded,
      ),
      map(() => NavActions.navigationRequested({ path: 'members' })),
    ),
  );

  navigateToSchedule$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        EventsActions.cancelSelected,
        EventsActions.addEventSucceeded,
        EventsActions.updateEventSucceeded,
      ),
      map(() => NavActions.navigationRequested({ path: 'schedule' })),
    ),
  );

  navigateToNews$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ArticlesActions.cancelSelected,
        ArticlesActions.publishArticleSucceeded,
        ArticlesActions.updateArticleSucceeded,
      ),
      map(() => NavActions.navigationRequested({ path: 'news' })),
    ),
  );

  navigateToTournament$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        TournamentsActions.addTournamentSucceeded,
        TournamentsActions.updateTournamentSucceeded,
      ),
      map(({ tournamentNumber }) =>
        NavActions.navigationRequested({ path: `tournaments/${tournamentNumber}` }),
      ),
    ),
  );

  leaveTournamentEditor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TournamentsActions.cancelSelected),
      map(({ tournamentNumber }) =>
        NavActions.navigationRequested({
          path:
            tournamentNumber === null ? 'tournaments' : `tournaments/${tournamentNumber}`,
        }),
      ),
    ),
  );

  navigateToTournamentsAfterDeletion$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TournamentsActions.deleteTournamentSucceeded),
      concatLatestFrom(() => this.store.select(NavSelectors.selectCurrentPath)),
      filter(
        ([{ tournamentNumber }, currentPath]) =>
          currentPath === `/tournaments/${tournamentNumber}`,
      ),
      map(() => NavActions.navigationRequested({ path: 'tournaments' })),
    ),
  );

  leaveMissingRecord$ = createEffect(() =>
    this.actions$.pipe(
      ofType(...RECORD_FETCH_FAILURES),
      filter(isMissingRecord),
      map(() => NavActions.navigationRequested({ path: '/' })),
    ),
  );

  navigateToNewsAfterArticleDeletion$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArticlesActions.deleteArticleSucceeded),
      concatLatestFrom(() => this.store.select(NavSelectors.selectCurrentPath)),
      filter(
        ([{ articleId }, currentPath]) => currentPath === `/article/view/${articleId}`,
      ),
      map(() => NavActions.navigationRequested({ path: 'news' })),
    ),
  );

  navigateToPhotoGallery$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ImagesActions.cancelSelected,
        ImagesActions.addImageSucceeded,
        ImagesActions.addImagesSucceeded,
        ImagesActions.updateImageSucceeded,
        ImagesActions.updateAlbumSucceeded,
      ),
      map(() => NavActions.navigationRequested({ path: 'photo-gallery' })),
    ),
  );

  handleEntityRouteNavigationRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(routerNavigatedAction),
      // A fragment moves within a record rather than choosing a different one
      map(({ payload }) => payload.event.url.split('#')[0]),
      distinctUntilChanged(),
      map(requestedPath => requestedPath.split('/').slice(1)),
      filter((segments): segments is [Entity, ...string[]] => isEntity(segments[0])),
      map(([entity, controlMode, encodedId]): Action | null => {
        const id = encodedId ? decodeURIComponent(encodedId) : null;

        switch (entity) {
          case 'album':
            if (controlMode === 'add' && !isDefined(id)) {
              return null;
            } else if (['edit', 'view'].includes(controlMode) && isString(id)) {
              return ImagesActions.fetchAlbumThumbnailsRequested({ album: id });
            }
            return NavActions.navigationRequested({ path: 'photo-gallery' });

          case 'article':
            if (controlMode === 'add' && !isDefined(id)) {
              return null;
            } else if (controlMode === 'view' && isCollectionId(id)) {
              // The route's guard fetches the article
              return null;
            } else if (controlMode === 'edit' && isCollectionId(id)) {
              return ArticlesActions.fetchArticleRequested({ articleId: id });
            }
            return NavActions.navigationRequested({ path: 'news' });

          case 'event':
            if (controlMode === 'add' && !isDefined(id)) {
              return null;
            } else if (controlMode === 'edit' && isCollectionId(id)) {
              return EventsActions.fetchEventRequested({ eventId: id });
            }
            return NavActions.navigationRequested({ path: 'schedule' });

          case 'image':
            if (controlMode === 'add' && !isDefined(id)) {
              return null;
            } else if (controlMode === 'edit' && isCollectionId(id)) {
              return ImagesActions.fetchMainImageRequested({ imageId: id });
            }
            return NavActions.navigationRequested({ path: 'photo-gallery' });

          case 'member':
            if (controlMode === 'add' && !isDefined(id)) {
              return null;
            } else if (controlMode === 'edit' && isCollectionId(id)) {
              return MembersActions.fetchMemberRequested({ memberId: id });
            }
            return NavActions.navigationRequested({ path: 'members' });

          case 'tournament':
            // The edit route's guard fetches the tournament
            if (
              (controlMode === 'add' && !isDefined(id)) ||
              (controlMode === 'edit' && isRecordNumber(id))
            ) {
              return null;
            }
            return NavActions.navigationRequested({ path: 'tournaments' });
        }
      }),
      filter(isDefined),
    ),
  );

  restoreFormDataOnNavigationAwayFromEntityRoute$ = createEffect(() =>
    this.actions$.pipe(
      ofType(routerNavigatedAction),
      map(({ payload }) => payload.event.url),
      concatLatestFrom(() => this.store.select(NavSelectors.selectCurrentPath)),
      map(([requestedPath, currentPath]) => ({
        requestedPage: requestedPath.split('/').slice(1)[0],
        current: currentPath ? currentPath.split('/').slice(1) : [],
      })),
      filter(
        (paths): paths is { requestedPage: string; current: [Entity, ...string[]] } =>
          isEntity(paths.current[0]) && paths.requestedPage !== paths.current[0],
      ),
      map(({ current: [entity, , idWithFragment] }) => {
        const id = idWithFragment
          ? decodeURIComponent(idWithFragment.split('#')[0])
          : null;

        switch (entity) {
          case 'album':
            // Album entity uses unique album name in place of a UUID
            return ImagesActions.albumFormDataRestored({ album: id });
          case 'article':
            return ArticlesActions.formDataRestored({ articleId: id });
          case 'event':
            return EventsActions.formDataRestored({ eventId: id });
          case 'image':
            return ImagesActions.imageFormDataRestored({ imageId: id });
          case 'member':
            return MembersActions.formDataRestored({ memberId: id });
          case 'tournament':
            return TournamentsActions.formDataRestored({
              tournamentNumber: isRecordNumber(id) ? Number(id) : null,
            });
        }
      }),
    ),
  );
}
