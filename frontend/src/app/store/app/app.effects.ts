import { ToastService } from '@eagami/ui';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import moment from 'moment-timezone';
import { filter, map, tap } from 'rxjs/operators';

import { Injectable } from '@angular/core';

import { LccError, MemberEmail, Toast } from '@app/models';
import * as ArticlesActions from '@app/store/articles/articles.actions';
import * as AuthSelectors from '@app/store/auth/auth.selectors';
import * as EventsActions from '@app/store/events/events.actions';
import * as GamesActions from '@app/store/games/games.actions';
import * as ImagesActions from '@app/store/images/images.actions';
import * as MembersActions from '@app/store/members/members.actions';
import * as NavActions from '@app/store/nav/nav.actions';
import { isDefined } from '@app/utils';

import { environment } from '@env';

import * as AppActions from './app.actions';
import * as AppSelectors from './app.selectors';

type NotifyAction = ReturnType<
  | (typeof AppActions)[keyof typeof AppActions]
  | (typeof ArticlesActions)[keyof typeof ArticlesActions]
  | (typeof EventsActions)[keyof typeof EventsActions]
  | (typeof GamesActions)[keyof typeof GamesActions]
  | (typeof ImagesActions)[keyof typeof ImagesActions]
  | (typeof MembersActions)[keyof typeof MembersActions]
  | (typeof NavActions)[keyof typeof NavActions]
>;

@Injectable()
export class AppEffects {
  readonly ACTIONS_TO_NOTIFY = [
    AppActions.unexpectedErrorOccurred,

    ArticlesActions.deleteArticleFailed,
    ArticlesActions.deleteArticleSucceeded,
    ArticlesActions.fetchArticleFailed,
    ArticlesActions.fetchFilteredArticlesFailed,
    ArticlesActions.fetchHomePageArticlesFailed,
    ArticlesActions.publishArticleFailed,
    ArticlesActions.publishArticleSucceeded,
    ArticlesActions.updateArticleFailed,
    ArticlesActions.updateArticleSucceeded,

    EventsActions.addEventFailed,
    EventsActions.addEventSucceeded,
    EventsActions.deleteEventFailed,
    EventsActions.deleteEventSucceeded,
    EventsActions.exportEventsToCsvFailed,
    EventsActions.exportEventsToCsvSucceeded,
    EventsActions.fetchEventFailed,
    EventsActions.fetchFilteredEventsFailed,
    EventsActions.fetchHomePageEventsFailed,
    EventsActions.updateEventFailed,
    EventsActions.updateEventSucceeded,

    GamesActions.fetchArchiveReferenceFailed,
    GamesActions.fetchFilteredGamesFailed,
    GamesActions.fetchGameFailed,
    GamesActions.randomGameFailed,

    ImagesActions.addImageFailed,
    ImagesActions.addImagesFailed,
    ImagesActions.addImageSucceeded,
    ImagesActions.addImagesSucceeded,
    ImagesActions.automaticAlbumCoverSwitchFailed,
    ImagesActions.automaticAlbumCoverSwitchSucceeded,
    ImagesActions.deleteAlbumFailed,
    ImagesActions.deleteAlbumSucceeded,
    ImagesActions.deleteImageFailed,
    ImagesActions.deleteImageSucceeded,
    ImagesActions.fetchAllImagesMetadataFailed,
    ImagesActions.fetchBatchThumbnailsFailed,
    ImagesActions.fetchFilteredThumbnailsFailed,
    ImagesActions.fetchMainImageFailed,
    ImagesActions.imageFileActionFailed,
    ImagesActions.updateAlbumFailed,
    ImagesActions.updateImageFailed,
    ImagesActions.updateAlbumSucceeded,
    ImagesActions.updateImageSucceeded,

    MembersActions.addMemberFailed,
    MembersActions.addMemberSucceeded,
    MembersActions.deleteMemberFailed,
    MembersActions.deleteMemberSucceeded,
    MembersActions.exportMembersToCsvFailed,
    MembersActions.exportMembersToCsvSucceeded,
    MembersActions.fetchMemberFailed,
    MembersActions.fetchAllMembersFailed,
    MembersActions.fetchFilteredMembersFailed,
    MembersActions.parseMemberRatingsFromCsvFailed,
    MembersActions.updateMemberFailed,
    MembersActions.updateMemberSucceeded,
    MembersActions.updateMemberRatingsSucceeded,
    MembersActions.updateMemberRatingsFailed,

    NavActions.pageAccessDenied,
  ] as const;

  readonly SUPPRESSED_TOASTS_IN_PROD = [
    ArticlesActions.fetchFilteredArticlesFailed,
    ArticlesActions.fetchHomePageArticlesFailed,
    ArticlesActions.fetchArticleFailed,

    EventsActions.fetchFilteredEventsFailed,
    EventsActions.fetchHomePageEventsFailed,
    EventsActions.fetchEventFailed,

    GamesActions.fetchArchiveReferenceFailed,
    GamesActions.fetchFilteredGamesFailed,
    GamesActions.fetchGameFailed,

    ImagesActions.fetchAllImagesMetadataFailed,
    ImagesActions.fetchBatchThumbnailsFailed,
    ImagesActions.fetchFilteredThumbnailsFailed,
    ImagesActions.fetchMainImageFailed,

    MembersActions.fetchAllMembersFailed,
    MembersActions.fetchFilteredMembersFailed,
    MembersActions.fetchMemberFailed,
  ] as const;

  readonly MISSING_RECORD_FAILURES = [
    ArticlesActions.fetchArticleFailed,
    EventsActions.fetchEventFailed,
    GamesActions.fetchGameFailed,
    MembersActions.fetchMemberFailed,
  ] as const;

  notify$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(...this.ACTIONS_TO_NOTIFY),
      filter(action => !this.isMissingRecord(action)),
      tap(action => {
        if ('error' in action) {
          console.error('[LCC]', action.error);
        }
      }),
      concatLatestFrom(() => this.store.select(AuthSelectors.selectIsAdmin)),
      filter(
        ([action, isAdmin]) =>
          isAdmin ||
          !environment.production ||
          !this.SUPPRESSED_TOASTS_IN_PROD.some(
            actionCreator => actionCreator.type === action.type,
          ),
      ),
      map(([action]) => this.mapActionToToast(action)),
      filter(isDefined),
      tap(toast =>
        this.toastService.show(toast.message, {
          title: toast.title,
          variant: toast.type,
        }),
      ),
      map(toast => AppActions.toastDisplayed({ toast })),
    );
  });

  reinstateUpcomingEventBanner$ = createEffect(() =>
    this.store.select(AppSelectors.selectBannerLastCleared).pipe(
      filter(
        bannerLastCleared =>
          isDefined(bannerLastCleared) && moment().diff(bannerLastCleared, 'days') > 0,
      ),
      map(() => AppActions.upcomingEventBannerReinstated()),
    ),
  );

  constructor(
    private readonly actions$: Actions,
    private readonly store: Store,
    private readonly toastService: ToastService,
  ) {}

  // A 404 on a single record is handled by sending the visitor home, not by a toast
  private isMissingRecord(action: NotifyAction): boolean {
    return (
      'error' in action &&
      action.error.status === 404 &&
      this.MISSING_RECORD_FAILURES.some(
        actionCreator => actionCreator.type === action.type,
      )
    );
  }

  private getErrorMessage(error: LccError): string {
    return error.message;
  }

  private getMemberUpdateMessage(name: string, emailSent: MemberEmail | null): string {
    if (emailSent === 'welcome') {
      return `Successfully updated ${name} and emailed them their login details.`;
    }
    if (emailSent === 'changes') {
      return `Successfully updated ${name} and emailed them the changes.`;
    }
    return `Successfully updated ${name}.`;
  }

  private mapActionToToast(action: NotifyAction): Toast | null {
    switch (action.type) {
      case AppActions.unexpectedErrorOccurred.type:
        return {
          title: 'Unexpected error',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ArticlesActions.deleteArticleFailed.type:
        return {
          title: 'Article deletion',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ArticlesActions.deleteArticleSucceeded.type:
        return {
          title: 'Article deletion',
          message: `Successfully deleted ${action.articleTitle}`,
          type: 'success',
        };
      case ArticlesActions.fetchArticleFailed.type:
        return {
          title: 'Load article',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ArticlesActions.fetchFilteredArticlesFailed.type:
        return {
          title: 'Load articles',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ArticlesActions.fetchHomePageArticlesFailed.type:
        return {
          title: 'Load articles',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ArticlesActions.publishArticleFailed.type:
        return {
          title: 'New article',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ArticlesActions.publishArticleSucceeded.type:
        return {
          title: 'New article',
          message: `Successfully published ${action.article.title}`,
          type: 'success',
        };
      case ArticlesActions.updateArticleFailed.type:
        return {
          title: 'Article update',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ArticlesActions.updateArticleSucceeded.type:
        return {
          title: 'Article update',
          message: `Successfully updated ${action.originalArticleTitle}`,
          type: 'success',
        };

      case EventsActions.addEventFailed.type:
        return {
          title: 'New event',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case EventsActions.addEventSucceeded.type:
        return {
          title: 'New event',
          message: `Successfully added ${action.event.title}`,
          type: 'success',
        };
      case EventsActions.deleteEventFailed.type:
        return {
          title: 'Event deletion',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case EventsActions.deleteEventSucceeded.type:
        return {
          title: 'Event deletion',
          message: `Successfully deleted ${action.eventTitle}`,
          type: 'success',
        };
      case EventsActions.exportEventsToCsvFailed.type:
        return {
          title: 'CSV export',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case EventsActions.exportEventsToCsvSucceeded.type:
        return {
          title: 'CSV export',
          message: `Successfully exported ${action.exportedCount} events to CSV`,
          type: 'success',
        };
      case EventsActions.fetchEventFailed.type:
        return {
          title: 'Load event',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case EventsActions.fetchFilteredEventsFailed.type:
        return {
          title: 'Load events',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case EventsActions.fetchHomePageEventsFailed.type:
        return {
          title: 'Load events',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case EventsActions.updateEventFailed.type:
        return {
          title: 'Event update',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case EventsActions.updateEventSucceeded.type:
        return {
          title: 'Event update',
          message: `Successfully updated ${action.originalEventTitle}`,
          type: 'success',
        };

      case ImagesActions.addImageFailed.type:
        return {
          title: 'Add image',
          message: `Failed to add image: ${this.getErrorMessage(action.error)}`,
          type: 'warning',
        };
      case ImagesActions.addImagesFailed.type:
        return {
          title: 'Add images',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ImagesActions.addImageSucceeded.type:
        return {
          title: 'Add image',
          message: `Successfully uploaded ${action.image.filename}`,
          type: 'success',
        };
      case ImagesActions.addImagesSucceeded.type:
        return {
          title: 'Add images',
          message: `Successfully uploaded ${action.images.length === 1 ? '1 image' : `${action.images.length} images`}`,
          type: 'success',
        };
      case ImagesActions.automaticAlbumCoverSwitchFailed.type:
        return {
          title: 'Album cover update',
          message: `Failed to automatically switch album cover for ${action.album}: ${this.getErrorMessage(action.error)}`,
          type: 'warning',
        };
      case ImagesActions.automaticAlbumCoverSwitchSucceeded.type:
        return {
          title: 'Album cover update',
          message: `Automatically switched ${action.baseImage.album} album cover to ${action.baseImage.filename}`,
          type: 'info',
        };
      case ImagesActions.deleteAlbumFailed.type:
        return {
          title: 'Album deletion',
          message: `Failed to delete ${action.album}: ${this.getErrorMessage(action.error)}`,
          type: 'warning',
        };
      case ImagesActions.deleteAlbumSucceeded.type:
        return {
          title: 'Album deletion',
          message:
            action.imageIds.length === 1
              ? `Successfully deleted ${action.album} and its only image`
              : `Successfully deleted ${action.album} and all ${action.imageIds.length} of its images`,
          type: 'success',
        };
      case ImagesActions.deleteImageFailed.type:
        return {
          title: 'Image deletion',
          message: `Failed to delete ${action.image.filename}: ${this.getErrorMessage(action.error)}`,
          type: 'warning',
        };
      case ImagesActions.deleteImageSucceeded.type:
        return {
          title: 'Image deletion',
          message: `Successfully deleted ${action.image.filename}`,
          type: 'success',
        };
      case GamesActions.fetchArchiveReferenceFailed.type:
        return {
          title: 'Load game archives',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case GamesActions.fetchFilteredGamesFailed.type:
        return {
          title: 'Load games',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case GamesActions.fetchGameFailed.type:
        return {
          title: 'Load game',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case GamesActions.randomGameFailed.type:
        return {
          title: 'Random game',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ImagesActions.fetchAllImagesMetadataFailed.type:
        return {
          title: "Fetch images' metadata",
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ImagesActions.fetchBatchThumbnailsFailed.type:
        return {
          title: 'Fetch images',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ImagesActions.fetchFilteredThumbnailsFailed.type:
        return {
          title: 'Fetch images',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ImagesActions.fetchMainImageFailed.type:
        return {
          title: 'Fetch image',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ImagesActions.imageFileActionFailed.type:
        return {
          title: 'Image file',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ImagesActions.updateAlbumFailed.type:
        return {
          title: 'Album update',
          message: `Failed to update album ${action.album}: ${this.getErrorMessage(action.error)}`,
          type: 'warning',
        };
      case ImagesActions.updateAlbumSucceeded.type:
        return {
          title: 'Album update',
          message: `Successfully updated ${action.album}`,
          type: 'success',
        };
      case ImagesActions.updateImageFailed.type:
        return {
          title: 'Image update',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case ImagesActions.updateImageSucceeded.type:
        return {
          title: 'Image update',
          message: `Successfully updated ${action.baseImage.filename}`,
          type: 'success',
        };

      case MembersActions.addMemberFailed.type:
        return {
          title: 'New member',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case MembersActions.addMemberSucceeded.type:
        return {
          title: 'New member',
          message:
            action.emailSent === 'welcome'
              ? `Successfully added ${action.member.firstName} ${action.member.lastName} and emailed them their login details.`
              : `Successfully added ${action.member.firstName} ${action.member.lastName}.`,
          type: 'success',
        };
      case MembersActions.deleteMemberFailed.type:
        return {
          title: 'Member deletion',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case MembersActions.deleteMemberSucceeded.type:
        return {
          title: 'Member deletion',
          message: `Successfully deleted ${action.memberName}`,
          type: 'success',
        };
      case MembersActions.exportMembersToCsvFailed.type:
        return {
          title: 'CSV export',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case MembersActions.exportMembersToCsvSucceeded.type:
        return {
          title: 'CSV export',
          message: `Successfully exported ${action.exportedCount} members to CSV`,
          type: 'success',
        };
      case MembersActions.fetchMemberFailed.type:
        return {
          title: 'Load member',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case MembersActions.fetchAllMembersFailed.type:
        return {
          title: 'Load members',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case MembersActions.fetchFilteredMembersFailed.type:
        return {
          title: 'Load members',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case MembersActions.parseMemberRatingsFromCsvFailed.type:
        return {
          title: 'CSV import',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case MembersActions.updateMemberFailed.type:
        return {
          title: 'Member update',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case MembersActions.updateMemberRatingsFailed.type:
        return {
          title: 'Members update',
          message: this.getErrorMessage(action.error),
          type: 'warning',
        };
      case MembersActions.updateMemberRatingsSucceeded.type:
        return action.unnotifiedMemberNames.length
          ? {
              title: 'Members update',
              message: `Updated ${action.members.length} members, but ${action.unnotifiedMemberNames.join(', ')} could not be emailed about their new rating.`,
              type: 'warning',
            }
          : {
              title: 'Members update',
              message: `Successfully updated ${action.members.length} members.`,
              type: 'success',
            };
      case MembersActions.updateMemberSucceeded.type:
        return {
          title: 'Member update',
          message: this.getMemberUpdateMessage(
            action.originalMemberName,
            action.emailSent,
          ),
          type: 'success',
        };

      case NavActions.pageAccessDenied.type:
        return {
          title: 'Access denied',
          message: `Please log in as admin to access ${action.pageHeading} page`,
          type: 'info',
        };

      default:
        console.warn('No toast mapping found for action:', action.type);
        return null;
    }
  }
}
