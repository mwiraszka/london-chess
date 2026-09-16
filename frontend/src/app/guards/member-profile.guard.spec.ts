import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { MembersActions } from '@app/store/members';

import { memberProfileGuard } from './member-profile.guard';

describe('memberProfileGuard', () => {
  const guard = memberProfileGuard('number');

  const mockRoute = (number: string): ActivatedRouteSnapshot =>
    Object.assign(new ActivatedRouteSnapshot(), { params: { number } });

  const runGuard = (number: string) =>
    TestBed.runInInjectionContext(() =>
      guard(mockRoute(number), TestBed.inject(Router).routerState.snapshot),
    );

  let dispatchSpy: MockInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideMockStore()] });
    dispatchSpy = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
  });

  it('should show the page straight away and load the member', () => {
    const result = runGuard('7');

    expect(result).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      MembersActions.fetchMemberByNumberRequested({ memberNumber: 7 }),
    );
  });

  it('should redirect home without a request when the number is malformed', () => {
    const router = TestBed.inject(Router);

    const result = runGuard('abc');

    expect(result).toEqual(router.createUrlTree(['/']));
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
