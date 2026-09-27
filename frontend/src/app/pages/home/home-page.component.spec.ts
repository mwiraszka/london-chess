import {
  CalendarDaysIconComponent,
  CameraIconComponent,
  DownloadIconComponent,
  InfoIconComponent,
  NewspaperIconComponent,
  PlusCircleIconComponent,
} from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_EVENTS } from '@app/mocks/events.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Image } from '@app/models';
import { DialogService, MetaAndTitleService, StoreRequestService } from '@app/services';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { AuthSelectors } from '@app/store/auth';
import { EventsActions, EventsSelectors } from '@app/store/events';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { lastOpenedDialog, query } from '@app/utils';

import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let component: HomePageComponent;

  let dialogService: DialogService;
  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dialogOpenSpy: MockInstance;
  let dispatchSpy: MockInstance;
  let onExportToCsvSpy: MockInstance;
  let storeRequestSpy: Mock;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  const mockHomePageArticles = MOCK_ARTICLES.slice(0, 3);
  const mockHomePageEvents = MOCK_EVENTS.slice(0, 3);
  const mockAllImages: Image[] = [
    ...MOCK_IMAGES.slice(0, 2),
    { ...MOCK_IMAGES[2], id: 'abc123', album: '_internal' },
  ];
  const mockIsAdmin = true;
  const mockNextEvent = MOCK_EVENTS[0];
  const mockPhotoImages = mockAllImages.filter(image => !image.album.startsWith('_'));
  const mockTotalCount = 999;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        { provide: DialogService, useValue: { open: vi.fn() } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
        provideMockStore(),
        provideRouter([]),
      ],
    }).compileComponents();

    dialogService = TestBed.inject(DialogService);

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    dispatchSpy = vi.spyOn(store, 'dispatch');
    onExportToCsvSpy = vi.spyOn(component, 'onExportToCsv');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');

    store.overrideSelector(
      ArticlesSelectors.selectHomePageArticles,
      mockHomePageArticles,
    );
    store.overrideSelector(EventsSelectors.selectHomePageEvents, mockHomePageEvents);
    store.overrideSelector(ImagesSelectors.selectAllImages, mockAllImages);
    store.overrideSelector(AuthSelectors.selectIsAdmin, mockIsAdmin);
    store.overrideSelector(EventsSelectors.selectNextEvent, mockNextEvent);
    store.overrideSelector(EventsSelectors.selectTotalCount, mockTotalCount);
    store.overrideSelector(ArticlesSelectors.selectHomePageArticlesStatus, 'loaded');
    store.overrideSelector(EventsSelectors.selectHomePageEventsStatus, 'loaded');
    store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'loaded');
    store.refreshState();
  });

  describe('ngOnInit', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should set meta title and description', () => {
      expect(updateTitleSpy).toHaveBeenCalledTimes(1);
      expect(updateTitleSpy).toHaveBeenCalledWith('London Chess Club');
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
    });

    it('should set viewModel$ with expected data', async () => {
      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm).toStrictEqual({
        homePageArticles: mockHomePageArticles,
        homePageEvents: mockHomePageEvents,
        allImages: mockAllImages,
        isAdmin: mockIsAdmin,
        nextEvent: mockNextEvent,
        photoImages: mockPhotoImages,
        articlesStatus: 'loaded',
        eventsStatus: 'loaded',
        photosStatus: 'loaded',
      });
    });
  });

  describe('load statuses', () => {
    it('should pass the events and photos statuses through', async () => {
      store.overrideSelector(EventsSelectors.selectHomePageEventsStatus, 'failed');
      store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'loading');
      store.refreshState();
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.eventsStatus).toBe('failed');
      expect(vm.photosStatus).toBe('loading');
    });

    it('should keep articles loading until their banner images have loaded', async () => {
      store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'loading');
      store.refreshState();
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.articlesStatus).toBe('loading');
    });

    it('should fail articles when their banner images fail to load', async () => {
      store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'failed');
      store.refreshState();
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.articlesStatus).toBe('failed');
    });
  });

  describe('onExportToCsv', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should return early if event count is zero', async () => {
      store.overrideSelector(EventsSelectors.selectTotalCount, 0);
      store.refreshState();

      await component.onExportToCsv();

      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should open confirmation dialog with correct event count', async () => {
      const dialogOpenSpy = vi.spyOn(dialogService, 'open').mockResolvedValue('cancel');

      await component.onExportToCsv();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: expect.any(Function),
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Export all ${mockTotalCount} events to a CSV file?`,
            confirmButtonText: 'Export',
            confirmButtonType: 'primary',
          }),
        },
        isModal: false,
      });
    });

    it('should export the events from the confirmation dialog', async () => {
      await component.onExportToCsv();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(storeRequestSpy).toHaveBeenCalledWith(
        EventsActions.exportEventsToCsvRequested(),
        [EventsActions.exportEventsToCsvSucceeded, EventsActions.exportEventsToCsvFailed],
      );
    });

    it('should not export anything until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onExportToCsv();

      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('onRetryArticles', () => {
    it('should fetch the articles and their banner images again', () => {
      component.onRetryArticles();

      expect(dispatchSpy).toHaveBeenCalledTimes(2);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ArticlesActions.fetchHomePageArticlesRequested(),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchAllImagesMetadataRequested(),
      );
    });
  });

  describe('onRetryEvents', () => {
    it('should fetch the events again', () => {
      component.onRetryEvents();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        EventsActions.fetchHomePageEventsRequested(),
      );
    });
  });

  describe('onRetryPhotos', () => {
    it('should fetch the photos again', () => {
      component.onRetryPhotos();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchAllImagesMetadataRequested(),
      );
    });
  });

  describe('component properties', () => {
    it('should have correct internal link configurations', () => {
      expect(component.aboutPageLink).toStrictEqual({
        text: 'More about the London Chess Club',
        internalPath: 'about',
        icon: InfoIconComponent,
      });

      expect(component.addEventLink).toStrictEqual({
        text: 'Add an event',
        internalPath: ['event', 'add'],
        icon: PlusCircleIconComponent,
      });

      expect(component.createArticleLink).toStrictEqual({
        text: 'Create an article',
        internalPath: ['article', 'add'],
        icon: PlusCircleIconComponent,
      });

      expect(component.newsPageLink).toStrictEqual({
        text: 'More news',
        internalPath: 'news',
        icon: NewspaperIconComponent,
      });

      expect(component.photoGalleryPageLink).toStrictEqual({
        text: 'More photos',
        internalPath: 'photo-gallery',
        icon: CameraIconComponent,
      });

      expect(component.schedulePageLink).toStrictEqual({
        text: 'All scheduled events',
        internalPath: 'schedule',
        icon: CalendarDaysIconComponent,
      });
    });

    it('should have correct exportToCsvButton configuration', () => {
      expect(component.exportToCsvButton).toEqual({
        id: 'export-to-csv',
        tooltip: 'Export to CSV',
        icon: DownloadIconComponent,
        action: expect.any(Function),
      });
    });

    it('should call onExportToCsv when exportToCsvButton action is called', () => {
      component.exportToCsvButton.action();

      expect(onExportToCsvSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render any content', () => {
        expect(query(fixture.debugElement, '.welcome-section')).toBeFalsy();
        expect(query(fixture.debugElement, '.schedule-section')).toBeFalsy();
        expect(query(fixture.debugElement, '.articles-section')).toBeFalsy();
        expect(query(fixture.debugElement, '.photos-section')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      beforeEach(() => {
        fixture.detectChanges();
      });

      it('should render all grid sections and their content', () => {
        expect(query(fixture.debugElement, '.welcome-section')).toBeTruthy();

        expect(
          query(fixture.debugElement, '.schedule-section lcc-events-table'),
        ).toBeTruthy();
        expect(
          query(fixture.debugElement, '.schedule-section lcc-link-list'),
        ).toBeTruthy();

        expect(
          query(fixture.debugElement, '.articles-section lcc-article-grid'),
        ).toBeTruthy();
        expect(
          query(fixture.debugElement, '.articles-section lcc-link-list'),
        ).toBeTruthy();

        expect(
          query(fixture.debugElement, '.photos-section lcc-photo-grid'),
        ).toBeTruthy();
        expect(query(fixture.debugElement, '.photos-section lcc-link-list')).toBeTruthy();
      });

      it('should render articles section admin toolbar in when admin', () => {
        expect(
          query(fixture.debugElement, '.articles-section lcc-admin-toolbar'),
        ).toBeTruthy();
      });

      it('should not render articles section admin toolbar when not admin', () => {
        store.overrideSelector(AuthSelectors.selectIsAdmin, false);
        store.refreshState();
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.articles-section lcc-admin-toolbar'),
        ).toBeFalsy();
      });
    });

    describe('when a section fails to load', () => {
      it('should render a failure panel in place of the events', () => {
        store.overrideSelector(EventsSelectors.selectHomePageEventsStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.schedule-section lcc-load-failed'),
        ).toBeTruthy();
        expect(
          query(fixture.debugElement, '.schedule-section lcc-events-table'),
        ).toBeFalsy();
      });

      it('should render a failure panel in place of the articles', () => {
        store.overrideSelector(ArticlesSelectors.selectHomePageArticlesStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.articles-section lcc-load-failed'),
        ).toBeTruthy();
        expect(
          query(fixture.debugElement, '.articles-section lcc-article-grid'),
        ).toBeFalsy();
      });

      it('should render a failure panel in place of the photos', () => {
        store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.photos-section lcc-load-failed'),
        ).toBeTruthy();
        expect(query(fixture.debugElement, '.photos-section lcc-photo-grid')).toBeFalsy();
      });

      it('should retry only the failed section', () => {
        store.overrideSelector(EventsSelectors.selectHomePageEventsStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();

        query(
          fixture.debugElement,
          '.schedule-section lcc-load-failed',
        ).triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledTimes(1);
        expect(dispatchSpy).toHaveBeenCalledWith(
          EventsActions.fetchHomePageEventsRequested(),
        );
      });
    });

    describe('when there are no upcoming events', () => {
      beforeEach(() => {
        store.overrideSelector(EventsSelectors.selectHomePageEvents, []);
      });

      it('should render the events table while the events load', () => {
        store.overrideSelector(EventsSelectors.selectHomePageEventsStatus, 'loading');
        store.refreshState();
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.schedule-section lcc-events-table'),
        ).toBeTruthy();
      });

      it('should not render the events table once the events have loaded', () => {
        store.refreshState();
        fixture.detectChanges();

        expect(
          query(fixture.debugElement, '.schedule-section lcc-events-table'),
        ).toBeFalsy();
      });
    });
  });
});
