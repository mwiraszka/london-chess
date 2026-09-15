import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';
import { firstValueFrom, of } from 'rxjs';
import { take } from 'rxjs/operators';

import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { ArticleComponent } from '@app/components/article/article.component';
import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ARTICLE_FORM_DATA_PROPERTIES, IMAGE_FORM_DATA_PROPERTIES } from '@app/constants';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { Article, Image } from '@app/models';
import { DialogService, MetaAndTitleService } from '@app/services';
import { AppState, initialState as appInitialState } from '@app/store/app';
import {
  ArticlesActions,
  ArticlesState,
  initialState as articlesInitialState,
} from '@app/store/articles';
import { AuthState } from '@app/store/auth';
import { ImagesState, initialState as imagesInitialState } from '@app/store/images';
import { query } from '@app/utils';

import { ArticleViewerPageComponent } from './article-viewer-page.component';

@Component({
  selector: 'lcc-article',
  template: '',
  standalone: true,
})
class MockArticleComponent {
  @Input({ required: true }) article!: Article;
  @Input({ required: true }) bannerImage!: Image | null;
  @Input() bodyImages: Image[] = [];
  @Input() isWideView = false;
}

describe('ArticleViewerPageComponent', () => {
  let fixture: ComponentFixture<ArticleViewerPageComponent>;
  let component: ArticleViewerPageComponent;

  let dialogService: DialogService;
  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dialogOpenSpy: MockInstance;
  let dispatchSpy: MockInstance;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  const mockArticle = MOCK_ARTICLES[0];
  const mockBannerImage = MOCK_IMAGES.find(
    image => image.id === mockArticle.bannerImageId,
  )!;

  beforeEach(async () => {
    const mockAppState: AppState = {
      ...appInitialState,
    };

    const mockArticlesState: ArticlesState = {
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

    const mockAuthState: AuthState = {
      user: {
        id: 'user-1',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        isAdmin: true,
      },
    };

    const mockImagesState: ImagesState = {
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

    await TestBed.configureTestingModule({
      imports: [ArticleViewerPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { params: of({ article_id: mockArticle.id }) },
        },
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
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
    })
      .overrideComponent(ArticleViewerPageComponent, {
        remove: { imports: [ArticleComponent] },
        add: {
          imports: [MockArticleComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ArticleViewerPageComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);
    store = TestBed.inject(MockStore);
    metaAndTitleService = TestBed.inject(MetaAndTitleService);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    dispatchSpy = vi.spyOn(store, 'dispatch');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');

    store.refreshState();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should set viewModel$ based on article title', async () => {
      const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

      expect(vm).toStrictEqual({
        article: mockArticle,
        isAdmin: true,
        bannerImage: mockBannerImage,
        bodyImages: [],
        isWideView: false,
      });
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

  describe('getAdminControlsConfig', () => {
    it('should return config with correct delete callback and edit path', () => {
      const config = component.getAdminControlsConfig(mockArticle);

      expect(config).toStrictEqual({
        buttonSize: 34,
        deleteCb: expect.any(Function),
        editPath: ['article', 'edit', mockArticle.id],
        itemName: mockArticle.title,
      });

      config.deleteCb();

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onDelete', () => {
    it('should dispatch deleteArticleRequested action when confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');

      // @ts-expect-error Private class member
      await component.onDelete(mockArticle);

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: {
            title: 'Confirm',
            body: `Update ${mockArticle.title}?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          },
        },
        isModal: true,
      });

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ArticlesActions.deleteArticleRequested({ article: mockArticle }),
      );
    });

    it('should not dispatch any action when dialog is cancelled', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      // @ts-expect-error Private class member
      await component.onDelete(mockArticle);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render page components', () => {
        expect(query(fixture.debugElement, 'lcc-article')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      it('should render page components', () => {
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-article')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });
    });
  });
});
