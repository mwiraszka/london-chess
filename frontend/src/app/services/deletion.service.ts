import { DialogService } from '@eagami/ui';
import { Action, ActionCreator } from '@ngrx/store';

import { Injectable, inject } from '@angular/core';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { Article, Dialog, Event, Image, Member, TournamentSummary } from '@app/models';
import { ArticlesActions } from '@app/store/articles';
import { EventsActions } from '@app/store/events';
import { ImagesActions } from '@app/store/images';
import { MembersActions } from '@app/store/members';
import { TournamentsActions } from '@app/store/tournaments';
import { formatDateRange } from '@app/utils';

import { StoreRequestService } from './store-request.service';

// Each resolves whether the record was deleted
@Injectable({ providedIn: 'root' })
export class DeletionService {
  private readonly dialogService = inject(DialogService);
  private readonly storeRequests = inject(StoreRequestService);

  public deleteArticle(article: Article): Promise<boolean> {
    return this.confirmDeletion(
      `Delete ${article.title}?`,
      ArticlesActions.deleteArticleRequested({ article }),
      ArticlesActions.deleteArticleSucceeded,
      ArticlesActions.deleteArticleFailed,
    );
  }

  public deleteEvent(event: Event): Promise<boolean> {
    return this.confirmDeletion(
      `Delete ${event.title}?`,
      EventsActions.deleteEventRequested({ event }),
      EventsActions.deleteEventSucceeded,
      EventsActions.deleteEventFailed,
    );
  }

  public deleteImage(image: Image): Promise<boolean> {
    return this.confirmDeletion(
      `Delete ${image.filename}?`,
      ImagesActions.deleteImageRequested({ image }),
      ImagesActions.deleteImageSucceeded,
      ImagesActions.deleteImageFailed,
    );
  }

  public deleteAlbum(album: string, photoCountText: string): Promise<boolean> {
    return this.confirmDeletion(
      `Delete ${album} and its ${photoCountText}?`,
      ImagesActions.deleteAlbumRequested({ album }),
      ImagesActions.deleteAlbumSucceeded,
      ImagesActions.deleteAlbumFailed,
    );
  }

  public deleteMember(member: Member): Promise<boolean> {
    return this.confirmDeletion(
      `Delete ${member.firstName} ${member.lastName}?`,
      MembersActions.deleteMemberRequested({ member }),
      MembersActions.deleteMemberSucceeded,
      MembersActions.deleteMemberFailed,
    );
  }

  public deleteTournament({
    number,
    name,
    date,
    endDate,
  }: Pick<TournamentSummary, 'number' | 'name' | 'date' | 'endDate'>): Promise<boolean> {
    return this.confirmDeletion(
      `Delete ${name} (${formatDateRange(date, endDate)})? Its results and registrations will be lost.`,
      TournamentsActions.deleteTournamentRequested({
        tournamentNumber: number,
        tournamentName: name,
      }),
      TournamentsActions.deleteTournamentSucceeded,
      TournamentsActions.deleteTournamentFailed,
    );
  }

  private async confirmDeletion(
    body: string,
    request: Action,
    succeeded: ActionCreator,
    failed: ActionCreator,
  ): Promise<boolean> {
    let outcome: Action | undefined;
    const dialog: Dialog = {
      title: 'Confirm',
      body,
      confirmButtonText: 'Delete',
      confirmButtonType: 'warning',
      confirmAction: async () => {
        outcome = await this.storeRequests.dispatch(request, [succeeded, failed]);
      },
    };

    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;

    return outcome?.type === succeeded.type;
  }
}
