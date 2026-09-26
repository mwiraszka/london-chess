import { XIconComponent } from '@eagami/ui';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  ViewContainerRef,
  inject,
  output,
  viewChild,
} from '@angular/core';

import { DialogConfig, DialogOutput } from '@app/models';
import { DIALOG_CONFIG_TOKEN } from '@app/services';

@Component({
  selector: 'lcc-dialog',
  template: `
    <header>
      <button
        class="close-button lcc-icon-button"
        (click)="result.emit('close')">
        <ea-icon-x />
      </button>
    </header>
    <ng-template #contentContainer></ng-template>
  `,
  styleUrl: './dialog.component.scss',
  imports: [XIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent<
  TComponent extends DialogOutput<TResult>,
  TResult,
> implements AfterViewInit {
  public readonly dialogConfig = inject<DialogConfig<TComponent>>(DIALOG_CONFIG_TOKEN);

  private readonly containerRef = viewChild('contentContainer', {
    read: ViewContainerRef,
  });
  private contentComponentRef?: ComponentRef<TComponent>;

  public readonly result = output<TResult | 'close'>();

  public ngAfterViewInit(): void {
    this.contentComponentRef = this.containerRef()?.createComponent<TComponent>(
      this.dialogConfig.componentType,
    );

    if (this.contentComponentRef) {
      for (const key in this.dialogConfig.inputs) {
        this.contentComponentRef.setInput(key, this.dialogConfig.inputs[key]);
      }

      this.contentComponentRef.instance.dialogResult.subscribe(result =>
        this.result.emit(result),
      );
    }
  }
}
