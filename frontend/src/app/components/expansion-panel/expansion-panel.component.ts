import { ChevronDownIconComponent, ChevronUpIconComponent } from '@eagami/ui';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'lcc-expansion-panel',
  standalone: true,
  imports: [ChevronDownIconComponent, ChevronUpIconComponent, CommonModule],
  template: `
    <div
      class="expansion-panel"
      [class.expanded]="expanded">
      <div
        class="expansion-header"
        (click)="expanded = !expanded">
        <div class="header-text">
          <ng-content select="[header]"></ng-content>
          @if (heading) {
            <h4>{{ heading }}</h4>
          }
        </div>
        @if (expanded) {
          <ea-icon-chevron-up class="expansion-icon" />
        } @else {
          <ea-icon-chevron-down class="expansion-icon" />
        }
      </div>

      @if (expanded) {
        <div class="expansion-content">
          <ng-content></ng-content>
        </div>
      }
    </div>
  `,
  styleUrl: './expansion-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpansionPanelComponent {
  @Input() expanded = false;
  @Input() heading?: string;
}
