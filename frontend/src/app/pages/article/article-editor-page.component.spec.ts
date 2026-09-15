import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';
import { BehaviorSubject, firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { ARTICLE_FORM_DATA_PROPERTIES, INITIAL_ARTICLE_FORM_DATA } from '@app/constants';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { Article, ArticleFormData, Id } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import {
  ArticlesActions,
  ArticlesState,
  initialState as articlesInitialState,
} from '@app/store/articles';
import { ImagesActions, initialState as imagesInitialState } from '@app/store/images';
import { query } from '@app/utils';

import { ArticleEditorPageComponent } from './article-editor-page.component';

describe('ArticleEditorPageComponent', () => {
  let fixture: ComponentFixture<ArticleEditorPageComponent>;
  let component: ArticleEditorPageComponent;

  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  let mockParamsSubject: BehaviorSubject<{ article_id?: Id }>;

  beforeEach(async () => {
    mockParamsSubject = new BehaviorSubject<{ article_id?: Id }>({});

    const mockArticlesState: ArticlesState = {
      ...articlesInitialState,
      ids: MOCK_ARTICLES.map(article => article.id),
      entities: MOCK_ARTICLES.reduce(
        (acc, article) => {
          acc[article.id] = {
            article,
            formData: pick(article, ARTICLE_FORM_DATA_PROPERTIES),
          };
          return acc;
        },
        {} as Record<Id, { article: Article; formData: ArticleFormData }>,
      ),
      totalCount: MOCK_ARTICLES.length,
    };

    await TestBed.configureTestingModule({
      imports: [ArticleEditorPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { params: mockParamsSubject.asObservable() },
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
            articlesState: mockArticlesState,
            imagesState: imagesInitialState,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleEditorPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');

    store.refreshState();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    describe('with article_id route param', () => {
      beforeEach(() => {
        mockParamsSubject.next({ article_id: MOCK_ARTICLES[0].id });
        component.ngOnInit();
      });

      it('should set viewModel$ based on article title', async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          bannerImage: null,
          bodyImages: [],
          formData: pick(MOCK_ARTICLES[0], ARTICLE_FORM_DATA_PROPERTIES),
          hasUnsavedChanges: false,
          originalArticle: MOCK_ARTICLES[0],
          pageHeading: `Edit ${MOCK_ARTICLES[0].title}`,
        });
      });

      it('should update title and meta tag accordingly', async () => {
        await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(updateTitleSpy).toHaveBeenCalledTimes(1);
        expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
        expect(updateTitleSpy).toHaveBeenCalledWith(`Edit ${MOCK_ARTICLES[0].title}`);
        expect(updateDescriptionSpy).toHaveBeenCalledWith(
          `Edit ${MOCK_ARTICLES[0].title} for the London Chess Club.`,
        );
      });
    });

    describe('without article_id route param', () => {
      beforeEach(() => {
        component.ngOnInit();
      });

      it("should default viewModel$ to 'create' mode", async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          bannerImage: null,
          bodyImages: [],
          formData: INITIAL_ARTICLE_FORM_DATA,
          hasUnsavedChanges: false,
          originalArticle: null,
          pageHeading: 'Compose an article',
        });
      });

      it('should update title and meta tag accordingly', async () => {
        await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(updateTitleSpy).toHaveBeenCalledTimes(1);
        expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
        expect(updateTitleSpy).toHaveBeenCalledWith('Compose an article');
        expect(updateDescriptionSpy).toHaveBeenCalledWith(
          'Compose an article for the London Chess Club.',
        );
      });
    });
  });

  describe('onCancel', () => {
    it('should dispatch cancelSelected action', () => {
      component.onCancel();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(ArticlesActions.cancelSelected());
    });
  });

  describe('onChange', () => {
    it('should dispatch changeSelected action', () => {
      const mockArticleId = 'abc123';
      const mockChangedFormData: Partial<ArticleFormData> = {
        title: 'A new title',
      };
      component.onChange(mockArticleId, mockChangedFormData);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ArticlesActions.formDataChanged({
          articleId: mockArticleId,
          formData: mockChangedFormData,
        }),
      );
    });
  });

  describe('onRequestFetchMainImage', () => {
    it('should dispatch fetchMainImageRequested action', () => {
      const mockImageId = 'abc123abc123';
      component.onRequestFetchMainImage(mockImageId);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ImagesActions.fetchMainImageRequested({ imageId: mockImageId }),
      );
    });
  });

  describe('onRequestPublishArticle', () => {
    it('should dispatch publishArticleRequested action', () => {
      component.onRequestPublishArticle();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(ArticlesActions.publishArticleRequested());
    });
  });

  describe('onRequestUpdateArticle', () => {
    it('should dispatch updateArticleRequested action', () => {
      const mockArticleId = 'abc123abc123';
      component.onRequestUpdateArticle(mockArticleId);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ArticlesActions.updateArticleRequested({ articleId: mockArticleId }),
      );
    });
  });

  describe('onRestore', () => {
    it('should dispatch formDataRestored action', () => {
      const mockArticleId = 'abc123';
      component.onRestore(mockArticleId);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        ArticlesActions.formDataRestored({ articleId: mockArticleId }),
      );
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render page components', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-article-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      beforeEach(() => {
        fixture.detectChanges();
      });

      it('should render page components', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-article-form')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });
    });
  });
});
