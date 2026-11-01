import { DialogRef, DialogService } from '@eagami/ui';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { inject } from '@angular/core';
import { type ActivatedRouteSnapshot, type CanDeactivateFn } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { BasicDialogResult, Dialog, EditorPage, UnsavedChangesPage } from '@app/models';
import { AuthSelectors } from '@app/store/auth';
import { declaredAccess, hasAccess } from '@app/utils';

let leaveDialog: DialogRef<BasicDialogResult> | null = null;

export const unsavedChangesGuard: CanDeactivateFn<EditorPage> = async (
  component,
  currentRoute,
) => {
  const dialogService = inject(DialogService);
  if (!canStillSave(currentRoute)) {
    return true;
  }

  const hasUnsavedChanges =
    component.viewModel$ &&
    (await firstValueFrom(component.viewModel$?.pipe(map(vm => vm.hasUnsavedChanges))));

  return (
    !hasUnsavedChanges ||
    confirmLeaving(
      dialogService,
      `Leave without saving? Your changes to the ${component.entity} are kept as a draft until you save or revert them.`,
    )
  );
};

export const unsavedAccountChangesGuard: CanDeactivateFn<UnsavedChangesPage> = (
  component,
  currentRoute,
  _currentState,
  nextState,
) => {
  const dialogService = inject(DialogService);
  // The account's sections are one page, so moving between them keeps every change
  const staysOnAccount = nextState.url.startsWith('/account/');

  return (
    staysOnAccount ||
    !canStillSave(currentRoute) ||
    !component.hasUnsavedChanges() ||
    confirmLeaving(
      dialogService,
      'Leave without saving? Your account changes will be lost.',
    )
  );
};

// Changes that can no longer be saved are not worth keeping anyone on a page
// they are no longer allowed to see
function canStillSave(route: ActivatedRouteSnapshot): boolean {
  const store = inject(Store);
  const user = store.selectSignal(AuthSelectors.selectUser)();
  const isAdmin = store.selectSignal(AuthSelectors.selectIsAdmin)();
  return hasAccess(declaredAccess(route.data), user, isAdmin);
}

async function confirmLeaving(
  dialogService: DialogService,
  body: string,
): Promise<boolean> {
  const dialog: Dialog = { title: 'Unsaved changes', body, confirmButtonText: 'Leave' };

  // A navigation made while this is up, such as Back, supersedes the one that opened it,
  // so it waits on the same answer
  if (!leaveDialog || leaveDialog.closed()) {
    leaveDialog = dialogService.open<BasicDialogResult>(BasicDialogComponent, {
      inputs: { dialog },
    });
  }

  return (await leaveDialog.result) === 'confirm';
}
