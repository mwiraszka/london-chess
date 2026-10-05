import { AlertComponent, CheckCircleIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lcc-safe-mode-notice',
  template: `
    <ea-alert
      live="off"
      size="sm"
      variant="success"
      [icon]="icon">
      Personal details have been hidden from view. You can disable Safe Mode from the User
      Settings menu.
    </ea-alert>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  imports: [AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafeModeNoticeComponent {
  protected readonly icon = CheckCircleIconComponent;
}
