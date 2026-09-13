import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { collectionIdGuard } from './collection-id.guard';

describe('collectionIdGuard', () => {
  const guard = collectionIdGuard('id');

  const mockRoute = (id: string): ActivatedRouteSnapshot =>
    Object.assign(new ActivatedRouteSnapshot(), { params: { id } });

  const runGuard = (id: string) =>
    TestBed.runInInjectionContext(() =>
      guard(mockRoute(id), TestBed.inject(Router).routerState.snapshot),
    );

  it('should allow a well-formed collection id', () => {
    const result = runGuard('679ee6771f33be5bf17b6d66');

    expect(result).toBe(true);
  });

  it('should redirect home when the id cannot be a collection id', () => {
    const router = TestBed.inject(Router);

    const result = runGuard('account');

    expect(result).toEqual(router.createUrlTree(['/']));
  });
});
