import {
  DividerComponent,
  ExternalLinkIconComponent,
  TooltipDirective,
} from '@eagami/ui';

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import packageJson from '../../../../package.json';

@Component({
  selector: 'lcc-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  imports: [DividerComponent, ExternalLinkIconComponent, RouterLink, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  public readonly CURRENT_VERSION = packageJson.version;
  public readonly CURRENT_YEAR = new Date().getFullYear();
}
