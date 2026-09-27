import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';
import { BehaviorSubject, EMPTY, Observable, Subject, firstValueFrom, take } from 'rxjs';

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
  let activatedRoute: { params: Observable<{ article_id?: Id }> };

  beforeEach(async () => {
    mockParamsSubject = new BehaviorSubject<{ article_id?: Id }>({});
    activatedRoute = { params: mockParamsSubject.asObservable() };

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
        provideMockActions(() => EMPTY),
        { provide: ActivatedRoute, useValue: activatedRoute },
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

  describe('initialization', () => {
    describe('with article_id route param', () => {
      beforeEach(() => {
        mockParamsSubject.next({ article_id: MOCK_ARTICLES[0].id });
        component.ngOnInit();
      });

      it('should set viewModel$ based on article title', async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          articleId: MOCK_ARTICLES[0].id,
          bannerImage: null,
          bodyImages: [],
          formData: pick(MOCK_ARTICLES[0], ARTICLE_FORM_DATA_PROPERTIES),
          hasUnsavedChanges: false,
          originalArticle: MOCK_ARTICLES[0],
          pageHeading: `Edit ${MOCK_ARTICLES[0].title}`,
          status: 'loaded',
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
          articleId: null,
          bannerImage: null,
          bodyImages: [],
          formData: INITIAL_ARTICLE_FORM_DATA,
          hasUnsavedChanges: false,
          originalArticle: null,
          pageHeading: 'Compose an article',
          status: 'loaded',
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

  describe('form events', () => {
    const articleForm = () => query(fixture.debugElement, 'lcc-article-form');

    beforeEach(() => {
      fixture.detectChanges();
      dispatchSpy.mockClear();
    });

    it('should cancel editing', () => {
      articleForm().triggerEventHandler('cancel');

      expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(
        ArticlesActions.cancelSelected(),
      );
    });

    it('should store changed form data', () => {
      const formData: Partial<ArticleFormData> = { title: 'A new title' };

      articleForm().triggerEventHandler('change', { articleId: 'abc123', formData });

      expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(
        ArticlesActions.formDataChanged({ articleId: 'abc123', formData }),
      );
    });

    it('should fetch a main image the form asks for', () => {
      articleForm().triggerEventHandler('requestFetchMainImage', 'abc123abc123');

      expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(
        ImagesActions.fetchMainImageRequested({ imageId: 'abc123abc123' }),
      );
    });

    it('should restore the saved article', () => {
      articleForm().triggerEventHandler('restore', 'abc123');

      expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(
        ArticlesActions.formDataRestored({ articleId: 'abc123' }),
      );
    });
  });

  describe('onRetry', () => {
    it('should not fetch anything for a new article', () => {
      component.onRetry(null);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    it('should render nothing until the route params arrive', () => {
      const params = new Subject<{ article_id?: Id }>();
      activatedRoute.params = params;

      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-link-list')).toBeFalsy();

      params.next({});
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-article-form')).toBeTruthy();
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

    describe('while the article is loading', () => {
      beforeEach(() => {
        mockParamsSubject.next({ article_id: 'unknown-id' });
        fixture.detectChanges();
      });

      it('should render a form skeleton in place of the form', () => {
        expect(query(fixture.debugElement, 'lcc-form-skeleton')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-article-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeFalsy();
      });
    });

    describe('when the article fails to load', () => {
      beforeEach(() => {
        store.setState({
          articlesState: { ...articlesInitialState, failedLoads: ['article'] },
          imagesState: imagesInitialState,
        });
        mockParamsSubject.next({ article_id: 'unknown-id' });
        fixture.detectChanges();
      });

      it('should render a failure panel in place of the form', () => {
        expect(query(fixture.debugElement, 'lcc-load-failed')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-form-skeleton')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-article-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });

      it('should fetch the article again on retry', () => {
        query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

        expect(dispatchSpy).toHaveBeenCalledWith(
          ArticlesActions.fetchArticleRequested({ articleId: 'unknown-id' }),
        );
      });
    });
  });
});
