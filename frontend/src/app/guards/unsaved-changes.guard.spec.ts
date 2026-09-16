import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { Dialog, EditorPage, User } from '@app/models';
import { DialogService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';

import { unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  let dialogService: DialogService;

  let dialogOpenSpy: MockInstance;

  const admin: User = {
    id: 'user123',
    firstName: 'Ada',
    lastName: 'Byron',
    email: 'ada@example.com',
    isAdmin: true,
  };

  const adminRoute = Object.assign(new ActivatedRouteSnapshot(), {
    data: { access: 'admin' },
  });
  const state = {
    url: '/article/edit/1',
    root: adminRoute,
    toString: () => '/article/edit/1',
  } as RouterStateSnapshot;

  const runGuard = (component: EditorPage, route = adminRoute) =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(component, route, state, state),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DialogService, useValue: { open: vi.fn() } },
        provideMockStore({
          selectors: [{ selector: AuthSelectors.selectUser, value: admin }],
        }),
      ],
    });

    dialogService = TestBed.inject(DialogService);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when component has no unsaved changes', async () => {
    const result = await runGuard({
      entity: 'article',
      viewModel$: of({ hasUnsavedChanges: false }),
    });

    expect(result).toBe(true);
    expect(dialogOpenSpy).not.toHaveBeenCalled();
  });

  it('should return true when component has no viewModel$', async () => {
    const result = await runGuard({ entity: 'article' });

    expect(result).toBe(true);
    expect(dialogOpenSpy).not.toHaveBeenCalled();
  });

  it('should leave without prompting when the route is no longer permitted', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: DialogService, useValue: { open: vi.fn() } },
        provideMockStore({
          selectors: [{ selector: AuthSelectors.selectUser, value: null }],
        }),
      ],
    });
    dialogOpenSpy = vi.spyOn(TestBed.inject(DialogService), 'open');

    const result = await runGuard({
      entity: 'article',
      viewModel$: of({ hasUnsavedChanges: true }),
    });

    expect(result).toBe(true);
    expect(dialogOpenSpy).not.toHaveBeenCalled();
  });

  it('should show dialog and return true when user confirms leaving with unsaved changes', async () => {
    dialogOpenSpy.mockResolvedValue('confirm');

    const result = await runGuard({
      entity: 'member',
      viewModel$: of({ hasUnsavedChanges: true }),
    });

    expect(result).toBe(true);
    expect(dialogOpenSpy).toHaveBeenCalledWith({
      componentType: BasicDialogComponent,
      isModal: false,
      inputs: {
        dialog: {
          title: 'Unsaved changes',
          body: 'Are you sure you want to leave? Any unsaved changes to the member will be lost.',
          confirmButtonText: 'Leave',
        } satisfies Dialog,
      },
    });
  });

  it('should show dialog and return false when user cancels leaving with unsaved changes', async () => {
    dialogOpenSpy.mockResolvedValue('cancel');

    const result = await runGuard({
      entity: 'event',
      viewModel$: of({ hasUnsavedChanges: true }),
    });

    expect(result).toBe(false);
  });

  it('should handle dialog rejection and return false', async () => {
    dialogOpenSpy.mockResolvedValue(null);

    const result = await runGuard({
      entity: 'member',
      viewModel$: of({ hasUnsavedChanges: true }),
    });

    expect(result).toBe(false);
  });
});
