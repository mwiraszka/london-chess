import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { MembersActions, MembersSelectors } from '@app/store/members';

import { memberProfileGuard } from './member-profile.guard';

describe('memberProfileGuard', () => {
  const guard = memberProfileGuard('number');

  let router: Router;
  let store: MockStore;

  let dispatchSpy: MockInstance;

  const mockRoute = (number: string): ActivatedRouteSnapshot =>
    Object.assign(new ActivatedRouteSnapshot(), { params: { number } });

  const runGuard = (number: string) =>
    TestBed.runInInjectionContext(() =>
      guard(mockRoute(number), router.routerState.snapshot),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => new ReplaySubject<Action>(1)),
        provideMockStore(),
      ],
    });

    router = TestBed.inject(Router);
    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  afterEach(() => store.resetSelectors());

  it('should redirect home without a request when the number is malformed', () => {
    const result = runGuard('abc');

    expect(result).toEqual(router.createUrlTree(['/']));
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should show a stored member straight away and fetch them again', () => {
    const member = { ...MOCK_MEMBERS[0], number: 7 };
    store.overrideSelector(MembersSelectors.selectAllMembers, [member]);
    store.refreshState();
    const result = runGuard('7');

    expect(result).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      MembersActions.fetchMemberByNumberRequested({ memberNumber: 7 }),
    );
  });

  it('should show a member who is not stored at once and fetch them', () => {
    store.overrideSelector(MembersSelectors.selectAllMembers, []);
    store.refreshState();

    const result = runGuard('7');

    expect(result).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      MembersActions.fetchMemberByNumberRequested({ memberNumber: 7 }),
    );
  });
});
