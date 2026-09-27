import { provideMockActions } from '@ngrx/effects/testing';
import {
  Action,
  createAction,
  createFeatureSelector,
  createSelector,
  props,
} from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';

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

  const outcomes = (result: ReturnType<typeof runGuard>): (boolean | UrlTree)[] => {
    const emitted: (boolean | UrlTree)[] = [];
    (result as Observable<boolean | UrlTree>).subscribe(value => emitted.push(value));
    return emitted;
  };

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

    const emitted = outcomes(runGuard(ID));

    expect(emitted).toEqual([true]);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should fetch a stored record again as it shows when it may have changed', () => {
    store.setState({ recordsState: { records: [{ id: ID }] } });

    const emitted = outcomes(runGuard(ID, true));

    expect(emitted).toEqual([true]);
    expect(dispatchSpy).toHaveBeenCalledWith(fetchRequested({ id: ID }));
  });

  it('should fetch a record that is not stored and show it once it arrives', () => {
    const emitted = outcomes(runGuard(ID));

    expect(dispatchSpy).toHaveBeenCalledWith(fetchRequested({ id: ID }));
    expect(emitted).toEqual([]);

    store.setState({ recordsState: { records: [{ id: ID }] } });

    expect(emitted).toEqual([true]);
  });

  it('should redirect home when the server does not have the record', () => {
    const emitted = outcomes(runGuard(ID));

    actions$.next(
      fetchFailed({ error: { name: 'LCCError', message: 'Not found', status: 404 } }),
    );

    expect(emitted).toEqual([router.createUrlTree(['/'])]);
  });

  it('should let the page show after any other failure, so it can try again', () => {
    const emitted = outcomes(runGuard(ID));

    actions$.next(fetchFailed({ error: { name: 'LCCError', message: 'Timed out' } }));

    expect(emitted).toEqual([true]);
  });

  it('should await the outcome before the request goes out', () => {
    const settled: (boolean | UrlTree)[] = [];
    dispatchSpy.mockImplementation((action: Action) => {
      if (action.type === fetchRequested.type) {
        actions$.next(
          fetchFailed({ error: { name: 'LCCError', message: 'Not found', status: 404 } }),
        );
      }
    });

    (runGuard(ID) as Observable<boolean | UrlTree>).subscribe(value =>
      settled.push(value),
    );

    expect(settled).toEqual([router.createUrlTree(['/'])]);
  });
});
