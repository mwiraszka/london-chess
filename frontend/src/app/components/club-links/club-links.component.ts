import { CardComponent, ExternalLinkIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lcc-club-links',
  templateUrl: './club-links.component.html',
  styleUrl: './club-links.component.scss',
  imports: [CardComponent, ExternalLinkIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubLinksComponent {}
