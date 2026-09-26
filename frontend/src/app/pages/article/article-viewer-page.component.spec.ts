import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';
import { provideMarkdown } from 'ngx-markdown';
import { Observable, Subject, firstValueFrom, of } from 'rxjs';
import { take } from 'rxjs/operators';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ARTICLE_FORM_DATA_PROPERTIES, IMAGE_FORM_DATA_PROPERTIES } from '@app/constants';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Id } from '@app/models';
import {
  DialogService,
  MetaAndTitleService,
  RoutingService,
  StoreRequestService,
} from '@app/services';
import { AppState, initialState as appInitialState } from '@app/store/app';
import {
  ArticlesActions,
  ArticlesState,
  initialState as articlesInitialState,
} from '@app/store/articles';
import { AuthState } from '@app/store/auth';
import { ImagesState, initialState as imagesInitialState } from '@app/store/images';
import { lastOpenedDialog, query } from '@app/utils';

import { ArticleViewerPageComponent } from './article-viewer-page.component';

describe('ArticleViewerPageComponent', () => {
  let fixture: ComponentFixture<ArticleViewerPageComponent>;
  let component: ArticleViewerPageComponent;

  let dialogService: DialogService;
  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dialogOpenSpy: MockInstance;
  let dispatchSpy: MockInstance;
  let storeRequestSpy: Mock;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  const mockArticle = MOCK_ARTICLES[0];
  const mockBannerImage = MOCK_IMAGES.find(
    image => image.id === mockArticle.bannerImageId,
  )!;

  let mockAppState: AppState;
  let mockArticlesState: ArticlesState;
  let mockAuthState: AuthState;
  let mockImagesState: ImagesState;
  let activatedRoute: { params: Observable<{ article_id: Id }> };

  beforeEach(() => {
    activatedRoute = { params: of({ article_id: mockArticle.id }) };
    mockAppState = {
      ...appInitialState,
    };

    mockArticlesState = {
      ...articlesInitialState,
      ids: [mockArticle.id],
      entities: {
        [mockArticle.id]: {
          article: mockArticle,
          formData: pick(mockArticle, ARTICLE_FORM_DATA_PROPERTIES),
        },
      },
      totalCount: 1,
    };

    mockAuthState = {
      user: {
        id: 'user-1',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        isAdmin: true,
      },
    };

    mockImagesState = {
      ...imagesInitialState,
      ids: [mockBannerImage.id],
      entities: {
        [mockBannerImage.id]: {
          image: mockBannerImage,
          formData: pick(mockBannerImage, IMAGE_FORM_DATA_PROPERTIES),
        },
      },
      totalCount: 1,
    };

    TestBed.configureTestingModule({
      imports: [ArticleViewerPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: RoutingService, useValue: { fragment$: of(null) } },
        provideMarkdown(),
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
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
        provideMockStore({
          initialState: {
            appState: mockAppState,
            articlesState: mockArticlesState,
            authState: mockAuthState,
            imagesState: mockImagesState,
          },
        }),
      ],
    });

    fixture = TestBed.createComponent(ArticleViewerPageComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);
    store = TestBed.inject(MockStore);
    metaAndTitleService = TestBed.inject(MetaAndTitleService);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    dispatchSpy = vi.spyOn(store, 'dispatch');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');

    store.refreshState();
  });

  describe('initialization', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should set viewModel$ based on article title', async () => {
      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm).toStrictEqual({
        article: mockArticle,
        articleId: mockArticle.id,
        isAdmin: true,
        bannerImage: mockBannerImage,
        bodyImages: [],
        isWideView: false,
        status: 'loaded',
      });
    });

    it('should describe a short article with its whole body', async () => {
      store.setState({
        appState: mockAppState,
        articlesState: {
          ...mockArticlesState,
          entities: {
            [mockArticle.id]: {
              article: { ...mockArticle, body: 'A short report.' },
              formData: pick(mockArticle, ARTICLE_FORM_DATA_PROPERTIES),
            },
          },
        },
        authState: mockAuthState,
        imagesState: mockImagesState,
      });

      await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(updateDescriptionSpy).toHaveBeenCalledWith('A short report.');
    });

    it('should update title and meta tag accordingly', async () => {
      await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(updateTitleSpy).toHaveBeenCalledTimes(1);
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
      expect(updateTitleSpy).toHaveBeenCalledWith(mockArticle.title);
      expect(updateDescriptionSpy).toHaveBeenCalledWith(
        mockArticle.body.slice(0, 197) + '...',
      );
    });
  });

  describe('admin controls', () => {
    const adminControls = () =>
      query(fixture.debugElement, 'lcc-article')
        .injector.get(AdminControlsDirective)
        .adminControls();

    it('should let an admin edit or delete the article', () => {
      fixture.detectChanges();

      const config = adminControls();

      expect(config).toStrictEqual({
        buttonSize: 34,
        deleteCb: expect.any(Function),
        editPath: ['article', 'edit', mockArticle.id],
        itemName: mockArticle.title,
      });

      config?.deleteCb();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
    });

    it('should not offer the controls to anyone else', () => {
      store.setState({
        appState: mockAppState,
        articlesState: mockArticlesState,
        authState: { user: null },
        imagesState: mockImagesState,
      });

      fixture.detectChanges();

      expect(adminControls()).toBeNull();
    });
  });

  describe('onDelete', () => {
    it('should delete the article from the confirmation dialog', async () => {
      // @ts-expect-error Private class member
      await component.onDelete(mockArticle);
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Update ${mockArticle.title}?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          }),
        },
        isModal: true,
      });
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ArticlesActions.deleteArticleRequested({ article: mockArticle }),
        [ArticlesActions.deleteArticleSucceeded, ArticlesActions.deleteArticleFailed],
      );
    });

    it('should not delete anything until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      // @ts-expect-error Private class member
      await component.onDelete(mockArticle);

      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    it('should render nothing until the route params arrive', () => {
      const params = new Subject<{ article_id: Id }>();
      activatedRoute.params = params;

      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-article-skeleton')).toBeFalsy();

      params.next({ article_id: mockArticle.id });
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-article')).toBeTruthy();
    });

    describe('when viewModel$ is defined', () => {
      it('should render page components', () => {
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-article')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });
    });

    describe('while the article loads', () => {
      beforeEach(() => {
        store.setState({
          appState: mockAppState,
          articlesState: articlesInitialState,
          authState: mockAuthState,
          imagesState: mockImagesState,
        });
        fixture.detectChanges();
      });

      it('should render an article skeleton', () => {
        expect(query(fixture.debugElement, 'lcc-article-skeleton')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-article')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeFalsy();
      });
    });

    describe('when the article fails to load', () => {
      beforeEach(() => {
        store.setState({
          appState: mockAppState,
          articlesState: { ...articlesInitialState, failedLoads: ['article'] },
          authState: mockAuthState,
          imagesState: mockImagesState,
        });
        fixture.detectChanges();
      });

      it('should render a failure panel in place of the article', () => {
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-article-skeleton')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-article')).toBeFalsy();
      });

      it('should fetch the article again on retry', () => {
        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledWith(
          ArticlesActions.fetchArticleRequested({ articleId: mockArticle.id }),
        );
      });
    });

    describe('when a stored article fails to refresh', () => {
      it('should keep showing the article', () => {
        store.setState({
          appState: mockAppState,
          articlesState: {
            ...mockArticlesState,
            failedLoads: ['article'],
          },
          authState: mockAuthState,
          imagesState: mockImagesState,
        });
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-article')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeFalsy();
      });
    });
  });
});
