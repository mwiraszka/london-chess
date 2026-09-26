import { ProgressBarComponent } from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  Renderer2,
  RendererFactory2,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { DialogButtonsComponent } from '@app/components/dialog-buttons/dialog-buttons.component';
import { BasicDialogResult, Dialog, DialogOutput } from '@app/models';

@Component({
  selector: 'lcc-basic-dialog',
  template: `
    <h3 class="dialog-title">{{ dialog().title }}</h3>
    <p class="dialog-body">{{ dialog().body }}</p>
    @if (dialog().uploadProgress?.(); as progress) {
      <div class="upload-progress">
        <ea-progress-bar
          [max]="progress.total"
          [value]="progress.uploaded" />
        <p class="upload-progress__text">
          Uploaded {{ progress.uploaded }} of {{ progress.total }}
          {{ progress.total === 1 ? 'image' : 'images' }}
        </p>
      </div>
    }
    <lcc-dialog-buttons
      [cancelText]="dialog().cancelButtonText ?? 'Cancel'"
      [confirmAction]="dialog().confirmAction"
      [confirmText]="dialog().confirmButtonText"
      [confirmVariant]="dialog().confirmButtonType ?? 'primary'"
      (result)="dialogResult.emit($event)" />
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

      .upload-progress {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .upload-progress__text {
        font-size: 12px;
        text-align: center;
      }
    }
  `,
  imports: [DialogButtonsComponent, ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicDialogComponent
  implements DialogOutput<BasicDialogResult>, OnInit, OnDestroy
{
  readonly dialog = input.required<Dialog>();

  public readonly dialogResult = output<BasicDialogResult | 'close'>();

  private readonly buttons = viewChild.required(DialogButtonsComponent);
  private readonly renderer: Renderer2 = inject(RendererFactory2).createRenderer(
    null,
    null,
  );

  private enterKeyListener?: () => void;

  public ngOnInit(): void {
    this.enterKeyListener = this.renderer.listen(
      'document',
      'keydown.enter',
      (event: KeyboardEvent) => {
        event.preventDefault();
        void this.buttons().confirm();
      },
    );
  }

  public ngOnDestroy(): void {
    this.enterKeyListener?.();
  }
}
