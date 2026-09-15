import { CheckCircleIconComponent } from '@eagami/ui';

import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'lcc-safe-mode-notice',
  template: `
    <ea-icon-check-circle />
    <aside>
      {{ entity | titlecase }} personal details have been hidden from view. You can
      disable Safe Mode from the User Settings menu.
    </aside>
  `,
  styleUrl: './safe-mode-notice.component.scss',
  imports: [CheckCircleIconComponent, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafeModeNoticeComponent {
  @Input({ required: true }) entity!: string;
}
