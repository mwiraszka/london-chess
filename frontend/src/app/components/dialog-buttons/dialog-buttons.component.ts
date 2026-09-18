import { SpinnerComponent } from '@eagami/ui';

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { BasicDialogResult } from '@app/models';

@Component({
  selector: 'lcc-dialog-buttons',
  templateUrl: './dialog-buttons.component.html',
  styleUrl: './dialog-buttons.component.scss',
  imports: [NgClass, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogButtonsComponent {
  readonly cancelText = input('Cancel');
  readonly confirmAction = input<() => Promise<unknown>>();
  readonly confirmDisabled = input(false);
  readonly confirmText = input.required<string>();
  readonly confirmVariant = input<'primary' | 'warning'>('primary');

  readonly result = output<BasicDialogResult>();

  protected readonly pending = signal(false);

  async confirm(): Promise<void> {
    if (this.pending() || this.confirmDisabled()) {
      return;
    }

    const confirmAction = this.confirmAction();
    if (confirmAction) {
      this.pending.set(true);
      try {
        await confirmAction();
      } finally {
        this.pending.set(false);
      }
    }
    this.result.emit('confirm');
  }
}
