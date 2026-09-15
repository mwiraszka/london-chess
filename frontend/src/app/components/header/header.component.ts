import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { RangePipe } from '@app/pipes';

@Component({
  selector: 'lcc-header',
  template: `
    <div class="app-header-container">
      <section class="branding">
        <a
          class="branding-link"
          routerLink="">
          <div class="image-container">
            <img
              src="assets/lcc-branding.svg"
              alt="London Chess Club"
              decoding="async"
              fetchpriority="high" />
          </div>
        </a>
        <a
          class="club-name-link"
          routerLink="">
          <h1>London Chess Club</h1>
        </a>
      </section>

      <section class="chess-pieces">
        @for (num of 5 | range: 1; track num) {
          <img
            [ngClass]="'pieces-' + num"
            src="assets/chess-pieces.svg"
            alt="Chess pieces" />
        }
      </section>
    </div>
  `,
  styleUrl: './header.component.scss',
  imports: [CommonModule, RangePipe, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {}
