import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';

import { INITIAL_ARTICLE_FORM_DATA } from '@app/constants';
import { MOCK_ARTICLES } from '@app/mocks/articles.mock';
import { ArticlesActions, initialState } from '@app/store/articles';
import { articlesAdapter } from '@app/store/articles/articles.reducer';

import { articleGuard } from './article.guard';

describe('articleGuard', () => {
  const article = { ...MOCK_ARTICLES[0], id: '679ee6771f33be5bf17b6d66' };

  let actions$: ReplaySubject<Action>;
  let router: Router;
  let store: MockStore;
  let dispatchSpy: MockInstance;

  const runGuard = (articleId: string) =>
    TestBed.runInInjectionContext(() =>
      articleGuard('article_id')(
        Object.assign(new ActivatedRouteSnapshot(), {
          params: { article_id: articleId },
        }),
        router.routerState.snapshot,
      ),
    );

  const outcomes = (articleId: string): (boolean | UrlTree)[] => {
    const emitted: (boolean | UrlTree)[] = [];
    (runGuard(articleId) as Observable<boolean | UrlTree>).subscribe(value =>
      emitted.push(value),
    );
    return emitted;
  };

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>(1);

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { articlesState: initialState } }),
      ],
    });

    router = TestBed.inject(Router);
    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  it('should redirect home when the article id is malformed', () => {
    const result = runGuard('not-an-id');

    expect(result).toEqual(router.createUrlTree(['/']));
  });

  it('should fetch a missing article and show it once it arrives', () => {
    const emitted = outcomes(article.id);

    store.setState({
      articlesState: articlesAdapter.addOne(
        { article, formData: INITIAL_ARTICLE_FORM_DATA },
        initialState,
      ),
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      ArticlesActions.fetchArticleRequested({ articleId: article.id }),
    );
    expect(emitted).toEqual([true]);
  });

  it('should refetch a stored article while showing it', () => {
    store.setState({
      articlesState: articlesAdapter.addOne(
        { article, formData: INITIAL_ARTICLE_FORM_DATA },
        initialState,
      ),
    });

    const emitted = outcomes(article.id);

    expect(emitted).toEqual([true]);
    expect(dispatchSpy).toHaveBeenCalledWith(
      ArticlesActions.fetchArticleRequested({ articleId: article.id }),
    );
  });

  it('should redirect home when the article does not exist', () => {
    const emitted = outcomes(article.id);

    actions$.next(
      ArticlesActions.fetchArticleFailed({
        error: { name: 'LCCError', message: 'Not found', status: 404 },
      }),
    );

    expect(emitted).toEqual([router.createUrlTree(['/'])]);
  });
});
