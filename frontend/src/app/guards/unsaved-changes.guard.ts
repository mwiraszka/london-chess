import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { BasicDialogResult, Dialog, EditorPage } from '@app/models';
import { DialogService } from '@app/services';

@Injectable({
  providedIn: 'root',
})
export class UnsavedChangesGuard implements CanDeactivate<EditorPage> {
  constructor(private readonly dialogService: DialogService) {}

  public async canDeactivate(component: EditorPage): Promise<boolean> {
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

    const result = await this.dialogService.open<BasicDialogComponent, BasicDialogResult>(
      {
        componentType: BasicDialogComponent,
        isModal: false,
        inputs: { dialog },
      },
    );

    return result === 'confirm';
  }
}
