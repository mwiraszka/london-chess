import { DialogRef, DialogService } from '@eagami/ui';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { inject } from '@angular/core';
import { type CanDeactivateFn } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { BasicDialogResult, Dialog, EditorPage } from '@app/models';
import { AuthSelectors } from '@app/store/auth';
import { declaredAccess, hasAccess } from '@app/utils';

let leaveDialog: DialogRef<BasicDialogResult> | null = null;

export const unsavedChangesGuard: CanDeactivateFn<EditorPage> = async (
  component,
  currentRoute,
) => {
  const dialogService = inject(DialogService);
  const user = inject(Store).selectSignal(AuthSelectors.selectUser)();

  // Changes that can no longer be saved are not worth keeping anyone on a page
  // they are no longer allowed to see
  if (!hasAccess(declaredAccess(currentRoute.data), user)) {
    return true;
  }

  const hasUnsavedChanges =
    component.viewModel$ &&
    (await firstValueFrom(component.viewModel$?.pipe(map(vm => vm.hasUnsavedChanges))));

  if (!hasUnsavedChanges) {
    return true;
  }

  const dialog: Dialog = {
    title: 'Unsaved changes',
    body: `Are you sure you want to leave? Any unsaved changes to the ${component.entity} will be lost.`,
    confirmButtonText: 'Leave',
  };

  // A navigation made while this is up, such as Back, supersedes the one that opened it,
  // so it waits on the same answer
  if (!leaveDialog || leaveDialog.closed()) {
    leaveDialog = dialogService.open<BasicDialogResult>(BasicDialogComponent, {
      inputs: { dialog },
    });
  }

  return (await leaveDialog.result) === 'confirm';
};
