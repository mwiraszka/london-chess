import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lcc-chesscom-logo',
  template: `
    <img
      src="assets/club-link-icons/chesscom.svg"
      alt=""
      aria-hidden="true" />
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    img {
      width: auto;
      height: 1em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChesscomLogoComponent {}
