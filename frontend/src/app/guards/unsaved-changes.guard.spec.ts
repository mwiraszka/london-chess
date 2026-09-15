import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { Dialog } from '@app/models';
import { DialogService } from '@app/services';

import { UnsavedChangesGuard } from './unsaved-changes.guard';

describe('UnsavedChangesGuard', () => {
  let dialogService: DialogService;
  let guard: UnsavedChangesGuard;

  let dialogOpenSpy: MockInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UnsavedChangesGuard,
        { provide: DialogService, useValue: { open: vi.fn() } },
      ],
    });

    dialogService = TestBed.inject(DialogService);
    guard = TestBed.inject(UnsavedChangesGuard);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canDeactivate', () => {
    it('should return true when component has no unsaved changes', async () => {
      const result = await guard.canDeactivate({
        entity: 'article',
        viewModel$: of({ hasUnsavedChanges: false }),
      });

      expect(result).toBe(true);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should return true when component has no viewModel$', async () => {
      const result = await guard.canDeactivate({ entity: 'article' });

      expect(result).toBe(true);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should show dialog and return true when user confirms leaving with unsaved changes', async () => {
      dialogOpenSpy.mockResolvedValue('confirm');
      const result = await guard.canDeactivate({
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
      const result = await guard.canDeactivate({
        entity: 'event',
        viewModel$: of({ hasUnsavedChanges: true }),
      });

      expect(result).toBe(false);
      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: {
          dialog: {
            title: 'Unsaved changes',
            body: 'Are you sure you want to leave? Any unsaved changes to the event will be lost.',
            confirmButtonText: 'Leave',
          },
        },
      });
    });

    it('should handle dialog rejection and return false', async () => {
      dialogOpenSpy.mockResolvedValue(null);

      const result = await guard.canDeactivate({
        entity: 'member',
        viewModel$: of({ hasUnsavedChanges: true }),
      });

      expect(result).toBe(false);
    });
  });
});
