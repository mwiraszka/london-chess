import { ButtonComponent, DialogService, HistoryIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { BasicDialogResult, Dialog } from '@app/models';

@Component({
  selector: 'lcc-form-actions',
  template: `
    <ea-button
      class="lcc-form-actions__restore restore-button"
      size="sm"
      variant="ghost"
      [disabled]="!hasUnsavedChanges()"
      [icon]="restoreIcon"
      (clicked)="onRevert()">
      Revert
    </ea-button>
    <div class="lcc-form-actions__primary">
      <ea-button
        class="cancel-button"
        size="sm"
        variant="secondary"
        [fullWidth]="true"
        [uppercase]="true"
        (clicked)="cancel.emit()">
        Cancel
      </ea-button>
      <ea-button
        class="submit-button"
        size="sm"
        type="submit"
        [disabled]="submitDisabled()"
        [fullWidth]="true"
        [uppercase]="true">
        {{ submitLabel() }}
      </ea-button>
    </div>
  `,
  host: { class: 'lcc-form-actions' },
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormActionsComponent {
  private readonly dialogService = inject(DialogService);

  public readonly entity = input.required<string>();
  public readonly hasUnsavedChanges = input.required<boolean>();
  public readonly submitDisabled = input.required<boolean>();
  public readonly submitLabel = input.required<string>();

  public readonly cancel = output<void>();
  public readonly restore = output<void>();

  protected readonly restoreIcon = HistoryIconComponent;

  public async onRevert(): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Revert to the original ${this.entity()} data? All changes will be lost.`,
      confirmButtonText: 'Revert',
      confirmButtonType: 'warning',
    };

    const result = await this.dialogService.open<BasicDialogResult>(
      BasicDialogComponent,
      {
        inputs: { dialog },
      },
    ).result;

    if (result === 'confirm') {
      this.restore.emit();
    }
  }
}
