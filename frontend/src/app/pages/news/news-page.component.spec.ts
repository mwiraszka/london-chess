import { PlusCircleIconComponent } from '@eagami/ui';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Article, DataPaginationOptions } from '@app/models';
import { MetaAndTitleService, StoreRequestService } from '@app/services';
import { ArticlesActions, ArticlesSelectors } from '@app/store/articles';
import { AuthSelectors } from '@app/store/auth';
import { ImagesActions, ImagesSelectors } from '@app/store/images';
import { query } from '@app/utils';

import { NewsPageComponent } from './news-page.component';

describe('NewsPageComponent', () => {
  let fixture: ComponentFixture<NewsPageComponent>;
  let component: NewsPageComponent;

  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  const mockArticles = MOCK_ARTICLES.slice(0, 3);
  const mockImages = MOCK_IMAGES.slice(0, 3);
  const mockFilteredCount = 15;
  const mockIsAdmin = true;
  const mockOptions: DataPaginationOptions<Article> = {
    page: 1,
    pageSize: 10,
    search: '',
    sortOrder: 'desc',
    sortBy: 'modificationInfo',
    filters: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsPageComponent],
      providers: [
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
        { provide: StoreRequestService, useValue: { dispatch: vi.fn() } },
        provideMockStore(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');

    store.overrideSelector(ArticlesSelectors.selectFilteredArticles, mockArticles);
    store.overrideSelector(ArticlesSelectors.selectFilteredCount, mockFilteredCount);
    store.overrideSelector(ImagesSelectors.selectAllImages, mockImages);
    store.overrideSelector(AuthSelectors.selectIsAdmin, mockIsAdmin);
    store.overrideSelector(ArticlesSelectors.selectOptions, mockOptions);
    store.overrideSelector(ArticlesSelectors.selectFilteredArticlesStatus, 'loaded');
    store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'loaded');
    store.refreshState();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should set meta title and description', () => {
      expect(updateTitleSpy).toHaveBeenCalledTimes(1);
      expect(updateTitleSpy).toHaveBeenCalledWith('News');
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
    });

    it('should set viewModel$ with expected data', async () => {
      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm).toStrictEqual({
        filteredArticles: mockArticles,
        filteredCount: mockFilteredCount,
        images: mockImages,
        isAdmin: mockIsAdmin,
        options: mockOptions,
        status: 'loaded',
      });
    });
  });

  describe('status', () => {
    it('should be loading while the articles load', async () => {
      store.overrideSelector(ArticlesSelectors.selectFilteredArticlesStatus, 'loading');
      store.refreshState();
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.status).toBe('loading');
    });

    it('should be loading while the banner images load', async () => {
      store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'loading');
      store.refreshState();
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.status).toBe('loading');
    });

    it('should fail when either load fails', async () => {
      store.overrideSelector(ArticlesSelectors.selectFilteredArticlesStatus, 'loading');
      store.overrideSelector(ImagesSelectors.selectMetadataStatus, 'failed');
      store.refreshState();
      component.ngOnInit();

      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm.status).toBe('failed');
    });
  });

  describe('onOptionsChange', () => {
    it('should dispatch paginationOptionsChanged action with fetch=true by default', () => {
      const options = mockOptions;
      component.onOptionsChange(options);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ArticlesActions.paginationOptionsChanged({ options, fetch: true }),
      );
    });

    it('should dispatch paginationOptionsChanged action with custom fetch value', () => {
      const options = mockOptions;
      component.onOptionsChange(options, false);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ArticlesActions.paginationOptionsChanged({ options, fetch: false }),
      );
    });
  });

  describe('onRetry', () => {
    it('should fetch the articles and their banner images again', () => {
      component.onRetry();

      expect(dispatchSpy).toHaveBeenCalledTimes(2);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ArticlesActions.fetchFilteredArticlesRequested(),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchAllImagesMetadataRequested(),
      );
    });
  });

  describe('createArticleLink', () => {
    it('should have correct properties', () => {
      expect(component.createArticleLink).toEqual({
        internalPath: ['article', 'add'],
        text: 'Create an article',
        icon: PlusCircleIconComponent,
      });
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render any content', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-data-toolbar')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-article-grid')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      beforeEach(() => {
        fixture.detectChanges();
      });

      it('should render page header, data toolbar and article grid', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-data-toolbar')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-article-grid')).toBeTruthy();
      });

      it('should render admin toolbar when admin', () => {
        expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeTruthy();
      });

      it('should not render admin toolbar when not admin', () => {
        store.overrideSelector(AuthSelectors.selectIsAdmin, false);
        store.refreshState();
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeFalsy();
      });
    });

    describe('when the articles fail to load', () => {
      beforeEach(() => {
        store.overrideSelector(ArticlesSelectors.selectFilteredArticlesStatus, 'failed');
        store.refreshState();
        fixture.detectChanges();
      });

      it('should render a failure panel in place of the article grid', () => {
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-article-grid')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-data-toolbar')).toBeTruthy();
      });

      it('should fetch everything again on retry', () => {
        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledWith(
          ArticlesActions.fetchFilteredArticlesRequested(),
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          ImagesActions.fetchAllImagesMetadataRequested(),
        );
      });
    });
  });
});
