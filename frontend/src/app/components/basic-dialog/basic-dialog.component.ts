import {
  ButtonComponent,
  DialogComponent,
  DialogRef,
  ProgressBarComponent,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { BasicDialogResult, Dialog } from '@app/models';

@Component({
  selector: 'lcc-basic-dialog',
  template: `
    <ea-dialog
      width="sm"
      [closeDisabled]="pending()"
      [closeOnBackdrop]="!pending()"
      [closeOnEscape]="!pending()"
      (keydown.enter)="onEnter($event)">
      <h3 slot="header">{{ dialog().title }}</h3>

      <p class="dialog-body">{{ dialog().body }}</p>

      @if (dialog().uploadProgress?.(); as progress) {
        <div
          slot="status"
          class="upload-progress">
          <ea-progress-bar
            [label]="uploadLabel()"
            [max]="progress.total"
            [value]="progress.uploaded" />
        </div>
      }

      <div slot="footer">
        <ea-button
          class="cancel-button"
          variant="secondary"
          [disabled]="pending()"
          (clicked)="dialogRef.close('cancel')">
          {{ dialog().cancelButtonText ?? 'Cancel' }}
        </ea-button>
        <ea-button
          class="confirm-button"
          [loading]="pending()"
          [variant]="dialog().confirmButtonType === 'warning' ? 'danger' : 'primary'"
          (clicked)="confirm()">
          {{ dialog().confirmButtonText }}
        </ea-button>
      </div>
    </ea-dialog>
  `,
  styles: `
    .dialog-body {
      white-space: pre-wrap;
    }
  `,
  imports: [ButtonComponent, DialogComponent, ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicDialogComponent {
  protected readonly dialogRef = inject<DialogRef<BasicDialogResult>>(DialogRef);

  readonly dialog = input.required<Dialog>();

  protected readonly pending = signal(false);

  protected readonly uploadLabel = computed(() => {
    const progress = this.dialog().uploadProgress?.();
    return progress
      ? `Uploaded ${progress.uploaded} of ${progress.total} ${progress.total === 1 ? 'image' : 'images'}`
      : '';
  });

  public async confirm(): Promise<void> {
    if (this.pending()) {
      return;
    }

    const confirmAction = this.dialog().confirmAction;
    if (confirmAction) {
      this.pending.set(true);
      try {
        await confirmAction();
      } finally {
        this.pending.set(false);
      }
    }
    this.dialogRef.close('confirm');
  }

  // A focused button answers Enter itself, so only Enter from elsewhere confirms
  protected onEnter(event: Event): void {
    if (event.target instanceof HTMLButtonElement) {
      return;
    }
    event.preventDefault();
    void this.confirm();
  }
}
