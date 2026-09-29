import { DialogRef, DialogService } from '@eagami/ui';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { BasicDialogResult, Dialog, EditorPage, User } from '@app/models';
import { AuthSelectors } from '@app/store/auth';
import { closedDialogRef } from '@app/utils';

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
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
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
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
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
    dialogOpenSpy.mockReturnValue(closedDialogRef('confirm'));

    const result = await runGuard({
      entity: 'member',
      viewModel$: of({ hasUnsavedChanges: true }),
    });

    expect(result).toBe(true);
    expect(dialogOpenSpy).toHaveBeenCalledWith(BasicDialogComponent, {
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
    dialogOpenSpy.mockReturnValue(closedDialogRef('cancel'));

    const result = await runGuard({
      entity: 'event',
      viewModel$: of({ hasUnsavedChanges: true }),
    });

    expect(result).toBe(false);
  });

  it('should return false when the dialog is dismissed', async () => {
    dialogOpenSpy.mockReturnValue(closedDialogRef());

    const result = await runGuard({
      entity: 'member',
      viewModel$: of({ hasUnsavedChanges: true }),
    });

    expect(result).toBe(false);
  });

  it('should let a navigation made while the dialog is up wait on the same answer', async () => {
    const leaveDialog = new DialogRef<BasicDialogResult>();
    const opened = new Promise<void>(resolve =>
      dialogOpenSpy.mockImplementation(() => {
        resolve();
        return leaveDialog;
      }),
    );
    const component: EditorPage = {
      entity: 'article',
      viewModel$: of({ hasUnsavedChanges: true }),
    };

    const superseded = runGuard(component);
    await opened;
    const checked = new Promise<void>(resolve =>
      vi.spyOn(leaveDialog, 'closed').mockImplementation(() => {
        resolve();
        return false;
      }),
    );
    const latest = runGuard(component);
    await checked;
    leaveDialog.close('confirm');

    expect(await latest).toBe(true);
    expect(await superseded).toBe(true);
    expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
  });

  it('should open a new dialog for a navigation made after the last one was answered', async () => {
    const component: EditorPage = {
      entity: 'article',
      viewModel$: of({ hasUnsavedChanges: true }),
    };
    dialogOpenSpy.mockReturnValueOnce(closedDialogRef('cancel'));
    dialogOpenSpy.mockReturnValueOnce(closedDialogRef('confirm'));

    const first = await runGuard(component);
    const second = await runGuard(component);

    expect(first).toBe(false);
    expect(second).toBe(true);
    expect(dialogOpenSpy).toHaveBeenCalledTimes(2);
  });
});
