import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  Renderer2,
  RendererFactory2,
} from '@angular/core';

import { BasicDialogResult, Dialog, DialogOutput } from '@app/models';

@Component({
  selector: 'lcc-basic-dialog',
  template: `
    <h3 class="dialog-title">{{ dialog.title }}</h3>
    <p class="dialog-body">{{ dialog.body }}</p>
    <div class="buttons-container">
      <button
        class="cancel-button lcc-secondary-button lcc-dark-button"
        (click)="dialogResult.emit('cancel')">
        {{ dialog.cancelButtonText ?? 'Cancel' }}
      </button>
      <button
        class="confirm-button"
        [ngClass]="
          dialog.confirmButtonType === 'warning'
            ? 'lcc-warning-button'
            : 'lcc-primary-button'
        "
        (click)="dialogResult.emit('confirm')">
        {{ dialog.confirmButtonText }}
      </button>
    </div>
  `,
  styles: `
    :host {
      width: 400px !important;
      display: flex;
      flex-direction: column;
      gap: 16px;
      text-align: start;
      padding: 16px 32px;

      .dialog-title {
        padding-bottom: 4px;
        border-bottom: 1px solid var(--lcc-color--basicDialog-dividerLine);
      }

      .dialog-body {
        white-space: pre-wrap;
      }

      .buttons-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }
    }
  `,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicDialogComponent implements DialogOutput<BasicDialogResult> {
  @Input({ required: true }) dialog!: Dialog;

  @Output() public dialogResult = new EventEmitter<BasicDialogResult | 'close'>();

  private enterKeyListener!: () => void;
  private readonly renderer!: Renderer2;

  constructor(private readonly rendererFactory: RendererFactory2) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  public ngOnInit(): void {
    this.enterKeyListener = this.renderer.listen(
      'document',
      'keydown.enter',
      (event: KeyboardEvent) => {
        event.preventDefault();
        this.dialogResult.emit('confirm');
      },
    );
  }

  public ngOnDestroy(): void {
    this.enterKeyListener();
  }
}
