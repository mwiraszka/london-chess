import {
  CalendarDaysIconComponent,
  CameraIconComponent,
  DownloadIconComponent,
  InfoIconComponent,
  NewspaperIconComponent,
  PlusCircleIconComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminToolbarComponent } from '@app/components/admin-toolbar/admin-toolbar.component';
import { ArticleGridComponent } from '@app/components/article-grid/article-grid.component';
import { ClubLinksComponent } from '@app/components/club-links/club-links.component';
import { EventsTableComponent } from '@app/components/events-table/events-table.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PhotoGridComponent } from '@app/components/photo-grid/photo-grid.component';
import { TournamentRegistrationsComponent } from '@app/components/tournament-registrations/tournament-registrations.component';
import {
  AdminButton,
  Article,
  Event,
  Image,
  InternalLink,
  LoadStatus,
  TournamentSummary,
} from '@app/models';
import { CsvExportService, MetaAndTitleService } from '@app/services';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { AuthSelectors } from '@app/store/auth';
import { EventsActions, EventsSelectors } from '@app/store/events';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { TournamentsSelectors } from '@app/store/tournaments';
import { combinedLoadStatus } from '@app/utils';

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
    LoadFailedComponent,
    PhotoGridComponent,
    RouterLink,
    TournamentRegistrationsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {
  private readonly csvExport = inject(CsvExportService);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);

  public viewModel$?: Observable<{
    allImages: Image[];
    homePageArticles: Article[];
    homePageEvents: Event[];
    articlesStatus: LoadStatus;
    eventsStatus: LoadStatus;
    isAdmin: boolean;
    photoImages: Image[];
    photosStatus: LoadStatus;
    tournamentSummaries: TournamentSummary[];
    tournamentsStatus: LoadStatus;
  }>;

  public aboutPageLink: InternalLink = {
    text: 'More about the London Chess Club',
    internalPath: 'faq',
    icon: InfoIconComponent,
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
    icon: NewspaperIconComponent,
  };
  public photoGalleryPageLink: InternalLink = {
    text: 'More photos',
    internalPath: 'photo-gallery',
    icon: CameraIconComponent,
  };
  public schedulePageLink: InternalLink = {
    text: 'All scheduled events',
    internalPath: 'schedule',
    icon: CalendarDaysIconComponent,
  };

  public exportToCsvButton: AdminButton = {
    id: 'export-to-csv',
    tooltip: 'Export to CSV',
    icon: DownloadIconComponent,
    action: () => this.csvExport.exportEvents(),
  };

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
      this.store.select(ArticlesSelectors.selectHomePageArticlesStatus),
      this.store.select(EventsSelectors.selectHomePageEventsStatus),
      this.store.select(ImagesSelectors.selectMetadataStatus),
      this.store.select(TournamentsSelectors.selectSummaries),
      this.store.select(TournamentsSelectors.selectSummariesStatus),
    ]).pipe(
      map(
        ([
          homePageArticles,
          homePageEvents,
          allImages,
          isAdmin,
          homePageArticlesStatus,
          eventsStatus,
          photosStatus,
          tournamentSummaries,
          tournamentsStatus,
        ]) => ({
          homePageArticles,
          homePageEvents,
          allImages,
          isAdmin,
          photoImages: allImages.filter(image => !image.album.startsWith('_')),
          // Article cards show their banner images, which come with the photos
          articlesStatus: combinedLoadStatus(homePageArticlesStatus, photosStatus),
          eventsStatus,
          photosStatus,
          tournamentSummaries,
          tournamentsStatus,
        }),
      ),
    );
  }

  public onRetryArticles(): void {
    this.store.dispatch(ArticlesActions.fetchHomePageArticlesRequested());
    this.onRetryPhotos();
  }

  public onRetryEvents(): void {
    this.store.dispatch(EventsActions.fetchHomePageEventsRequested());
  }

  public onRetryPhotos(): void {
    this.store.dispatch(ImagesActions.fetchAllImagesMetadataRequested());
  }
}
