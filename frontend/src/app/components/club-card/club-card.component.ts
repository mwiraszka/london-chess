import {
  ExternalLinkIconComponent,
  MailIconComponent,
  MapPinIconComponent,
} from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ClubMapComponent } from '@app/components/club-map/club-map.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { Club } from '@app/models';

@Component({
  selector: 'lcc-club-card',
  templateUrl: './club-card.component.html',
  styleUrls: ['./club-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClubMapComponent,
    ExternalLinkIconComponent,
    MailIconComponent,
    MapPinIconComponent,
    TooltipDirective,
  ],
})
export class ClubCardComponent {
  readonly club = input.required<Club>();
}
