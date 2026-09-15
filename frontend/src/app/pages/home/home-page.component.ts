import { DownloadIconComponent, PlusCircleIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { ArticleGridComponent } from '@app/components/article-grid/article-grid.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ClubLinksComponent } from '@app/components/club-links/club-links.component';
import { EventsTableComponent } from '@app/components/events-table/events-table.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { PhotoGridComponent } from '@app/components/photo-grid/photo-grid.component';
import { REGIONAL_CLUBS } from '@app/constants/clubs';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import {
  AdminButton,
  Article,
  BasicDialogResult,
  Dialog,
  Event,
  Id,
  Image,
  InternalLink,
} from '@app/models';
import { DialogService, MetaAndTitleService } from '@app/services';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { AuthSelectors } from '@app/store/auth';
import { EventsActions, EventsSelectors } from '@app/store/events';
import { ImagesActions, ImagesSelectors } from '@app/store/images';

@UntilDestroy()
@Component({
  selector: 'lcc-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  imports: [
    AdminToolbarComponent,
    ArticleGridComponent,
    ClubLinksComponent,
    CommonModule,
    EventsTableComponent,
    LinkListComponent,
    PhotoGridComponent,
    RouterLink,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {
  public readonly REGIONAL_CLUBS = REGIONAL_CLUBS;

  public viewModel$?: Observable<{
    allImages: Image[];
    homePageArticles: Article[];
    homePageEvents: Event[];
    isAdmin: boolean;
    isLoadingArticles: boolean;
    isLoadingEvents: boolean;
    isLoadingImages: boolean;
    nextEvent: Event | null;
    photoImages: Image[];
  }>;

  public aboutPageLink: InternalLink = {
    text: 'More about the London Chess Club',
    internalPath: 'about',
  };
  public readonly addEventLink: InternalLink = {
    text: 'Add an event',
    internalPath: ['event', 'add'],
    icon: PlusCircleIconComponent,
  };
  public createArticleLink: InternalLink = {
    text: 'Create an article',
    internalPath: ['article', 'add'],
    icon: PlusCircleIconComponent,
  };
  public newsPageLink: InternalLink = {
    text: 'More news',
    internalPath: 'news',
  };
  public photoGalleryPageLink: InternalLink = {
    text: 'More photos',
    internalPath: 'photo-gallery',
  };
  public schedulePageLink: InternalLink = {
    text: 'All scheduled events',
    internalPath: 'schedule',
  };

  public exportToCsvButton: AdminButton = {
    id: 'export-to-csv',
    tooltip: 'Export to CSV',
    icon: DownloadIconComponent,
    action: () => this.onExportToCsv(),
  };

  constructor(
    private readonly dialogService: DialogService,
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('London Chess Club');
    this.metaAndTitleService.updateDescription(
      `The London Chess Club is open to players of all ages and abilities. We host
      regular blitz and rapid chess tournaments, as well as a variety of lectures, simuls
      and team competitions.`,
    );

    this.viewModel$ = combineLatest([
      this.store.select(ArticlesSelectors.selectHomePageArticles),
      this.store.select(EventsSelectors.selectHomePageEvents),
      this.store.select(ImagesSelectors.selectAllImages),
      this.store.select(AuthSelectors.selectIsAdmin),
      this.store.select(EventsSelectors.selectNextEvent),
      this.store.select(ArticlesSelectors.selectLastHomePageFetch),
      this.store.select(EventsSelectors.selectLastHomePageFetch),
      this.store.select(ImagesSelectors.selectLastMetadataFetch),
    ]).pipe(
      untilDestroyed(this),
      map(
        ([
          homePageArticles,
          homePageEvents,
          allImages,
          isAdmin,
          nextEvent,
          lastArticlesFetch,
          lastEventsFetch,
          lastImagesFetch,
        ]) => ({
          homePageArticles,
          homePageEvents,
          allImages,
          isAdmin,
          nextEvent,
          photoImages: allImages.filter(image => !image.album.startsWith('_')),
          isLoadingArticles: lastArticlesFetch === null,
          isLoadingEvents: lastEventsFetch === null,
          isLoadingImages: lastImagesFetch === null,
        }),
      ),
    );
  }

  public async onExportToCsv(): Promise<void> {
    const eventCount = await firstValueFrom(
      this.store.select(EventsSelectors.selectTotalCount),
    );

    if (!eventCount) {
      return;
    }

    const dialog: Dialog = {
      title: 'Confirm',
      body: `Export all ${eventCount} events to a CSV file?`,
      confirmButtonText: 'Export',
      confirmButtonType: 'primary',
    };

    const dialogResult = await this.dialogService.open<
      BasicDialogComponent,
      BasicDialogResult
    >({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: false,
    });

    if (dialogResult !== 'confirm') {
      return;
    }

    this.store.dispatch(EventsActions.exportEventsToCsvRequested());
  }

  public onRequestDeleteAlbum(album: string): void {
    this.store.dispatch(ImagesActions.deleteAlbumRequested({ album }));
  }

  public onRequestDeleteArticle(article: Article): void {
    this.store.dispatch(ArticlesActions.deleteArticleRequested({ article }));
  }

  public onRequestDeleteEvent(event: Event): void {
    this.store.dispatch(EventsActions.deleteEventRequested({ event }));
  }

  public onRequestUpdateArticleBookmark(event: {
    articleId: Id;
    bookmark: boolean;
  }): void {
    this.store.dispatch(ArticlesActions.updateArticleBookmarkRequested(event));
  }
}
