import { provideMockActions } from '@ngrx/effects/testing';
import { Action, createAction, props } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { StoreRequestService } from './store-request.service';

const requested = createAction('[Test] Requested');
const succeeded = createAction('[Test] Succeeded', props<{ id: string }>());
const failed = createAction('[Test] Failed');
const unrelated = createAction('[Test] Unrelated');

describe('StoreRequestService', () => {
  let actions$: Subject<Action>;
  let service: StoreRequestService;
  let store: MockStore;

  let dispatchSpy: MockInstance;

  beforeEach(() => {
    actions$ = new Subject<Action>();

    TestBed.configureTestingModule({
      providers: [provideMockActions(() => actions$), provideMockStore()],
    });

    service = TestBed.inject(StoreRequestService);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  it('should dispatch the request', () => {
    void service.dispatch(requested(), [succeeded, failed]);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(requested());
  });

  it('should settle with the success outcome', async () => {
    const outcome = service.dispatch(requested(), [succeeded, failed]);

    actions$.next(unrelated());
    actions$.next(succeeded({ id: 'abc' }));

    await expect(outcome).resolves.toEqual(succeeded({ id: 'abc' }));
  });

  it('should settle with the failure outcome', async () => {
    const outcome = service.dispatch(requested(), [succeeded, failed]);

    actions$.next(failed());

    await expect(outcome).resolves.toEqual(failed());
  });

  it('should settle with the first outcome only', async () => {
    const outcome = service.dispatch(requested(), [succeeded, failed]);

    actions$.next(failed());
    actions$.next(succeeded({ id: 'abc' }));

    await expect(outcome).resolves.toEqual(failed());
  });

  it('should catch an outcome that follows the request synchronously', async () => {
    dispatchSpy.mockImplementation(() => actions$.next(failed()));

    const outcome = service.dispatch(requested(), [succeeded, failed]);

    await expect(outcome).resolves.toEqual(failed());
  });

  it('should ignore outcomes from before the request', async () => {
    actions$.next(succeeded({ id: 'earlier' }));

    const outcome = service.dispatch(requested(), [succeeded, failed]);
    actions$.next(failed());

    await expect(outcome).resolves.toEqual(failed());
  });

  it('should stay pending until an outcome arrives', async () => {
    const settled = vi.fn();

    void service.dispatch(requested(), [succeeded, failed]).then(settled);
    actions$.next(unrelated());
    await Promise.resolve();

    expect(settled).not.toHaveBeenCalled();
  });
});
