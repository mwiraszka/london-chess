import { provideMockActions } from '@ngrx/effects/testing';
import {
  Action,
  createAction,
  createFeatureSelector,
  createSelector,
  props,
} from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { LccError } from '@app/models';
import { isCollectionId } from '@app/utils';

import { recordGuard } from './record.guard';

interface Record {
  id: string;
}

interface RecordsState {
  records: Record[];
}

const selectRecordsState = createFeatureSelector<RecordsState>('recordsState');

const selectRecordById = (id: string) =>
  createSelector(
    selectRecordsState,
    state => state.records.find(record => record.id === id) ?? null,
  );

const fetchRequested = createAction('[Test] Fetch requested', props<{ id: string }>());
const fetchFailed = createAction('[Test] Fetch failed', props<{ error: LccError }>());

const ID = '679ee6771f33be5bf17b6d66';

describe('recordGuard', () => {
  let actions$: ReplaySubject<Action>;
  let router: Router;
  let store: MockStore;

  let dispatchSpy: MockInstance;

  const guard = (refreshes = false) =>
    recordGuard<Record>({
      param: 'id',
      isWellFormed: isCollectionId,
      select: selectRecordById,
      request: id => fetchRequested({ id }),
      failed: fetchFailed,
      refreshes,
    });

  const mockRoute = (id: string): ActivatedRouteSnapshot =>
    Object.assign(new ActivatedRouteSnapshot(), { params: { id } });

  const runGuard = (id: string, refreshes = false) =>
    TestBed.runInInjectionContext(() =>
      guard(refreshes)(mockRoute(id), router.routerState.snapshot),
    );

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>(1);

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { recordsState: { records: [] } } }),
      ],
    });

    router = TestBed.inject(Router);
    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  it('should redirect home without a request when the id is malformed', () => {
    const result = runGuard('latest');

    expect(result).toEqual(router.createUrlTree(['/']));
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should let a stored record show at once', () => {
    store.setState({ recordsState: { records: [{ id: ID }] } });

    const result = runGuard(ID);

    expect(result).toBe(true);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should fetch a stored record again as it shows when it may have changed', () => {
    store.setState({ recordsState: { records: [{ id: ID }] } });

    const result = runGuard(ID, true);

    expect(result).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(fetchRequested({ id: ID }));
  });

  it('should open the page at once and fetch a record that is not stored', () => {
    const result = runGuard(ID);

    expect(result).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(fetchRequested({ id: ID }));
  });

  describe('when the record is fetched', () => {
    let navigateSpy: MockInstance;

    beforeEach(() => {
      navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    });

    it('should send the visitor home when the server does not have the record', () => {
      runGuard(ID);

      actions$.next(
        fetchFailed({ error: { name: 'LCCError', message: 'Not found', status: 404 } }),
      );

      expect(navigateSpy).toHaveBeenCalledWith('/', { replaceUrl: true });
    });

    it('should leave the page to offer a retry after any other failure', () => {
      runGuard(ID);

      actions$.next(fetchFailed({ error: { name: 'LCCError', message: 'Timed out' } }));

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should catch a failure that arrives as the request goes out', () => {
      dispatchSpy.mockImplementation((action: Action) => {
        if (action.type === fetchRequested.type) {
          actions$.next(
            fetchFailed({
              error: { name: 'LCCError', message: 'Not found', status: 404 },
            }),
          );
        }
      });

      runGuard(ID);

      expect(navigateSpy).toHaveBeenCalledWith('/', { replaceUrl: true });
    });
  });
});
