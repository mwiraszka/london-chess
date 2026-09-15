import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lcc-lichess-logo',
  template: `
    <img
      src="assets/club-link-icons/lichess.svg"
      alt=""
      aria-hidden="true" />
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    img {
      width: 1em;
      height: 1em;
    }

    // The saved logo is solid black; the app theme decides when to flip it
    :host-context(body[data-theme='dark']) img {
      filter: invert(1);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessLogoComponent {}
