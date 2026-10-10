import LichessPgnViewer from 'lichess-pgn-viewer';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { Game } from '@app/models';
import { buildPgn, playerName, playerScores } from '@app/utils';

const CONTROL_LABELS: Record<string, string> = {
  first: 'First move',
  prev: 'Previous move',
  next: 'Next move',
  last: 'Last move',
};

@Component({
  selector: 'lcc-pgn-viewer',
  template: `<div #board></div>`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PgnViewerComponent {
  public readonly game = input.required<Game>();

  private readonly board = viewChild.required<ElementRef<HTMLElement>>('board');

  protected readonly pgn = computed(() => buildPgn(this.game()));

  // The viewer's buttons show only icons, and it adds and removes some as its menu
  // opens and closes, so each one is named as it appears
  private readonly controlsObserver = new MutationObserver(records =>
    records.forEach(({ target }) => this.labelControls(target as HTMLElement)),
  );

  constructor() {
    effect(() => this.render(this.game(), this.board().nativeElement));
    inject(DestroyRef).onDestroy(() => this.controlsObserver.disconnect());
  }

  private render(game: Game, container: HTMLElement): void {
    this.controlsObserver.disconnect();
    container.replaceChildren();

    LichessPgnViewer(container, {
      initialPly: 1,
      orientation: 'white',
      pgn: this.pgn(),
      showClocks: false,
    });

    const scores = playerScores(game.result);
    const label = (side: 'bottom' | 'top', name: string, score: string) => {
      const person = container.querySelector(
        `.lpv__player--${side} > .lpv__player__person`,
      );
      person?.setAttribute('data-name', name);
      person?.setAttribute('data-score', score);
    };
    label('bottom', playerName(game.white), scores.white);
    label('top', playerName(game.black), scores.black);

    const controls = container.querySelector<HTMLElement>('.lpv__controls');
    if (controls) {
      this.labelControls(controls);
      this.controlsObserver.observe(controls, { childList: true });
    }
  }

  private labelControls(controls: HTMLElement): void {
    controls.querySelectorAll<HTMLElement>('.lpv__controls__goto').forEach(button => {
      const direction = [...button.classList]
        .find(name => name.startsWith('lpv__controls__goto--'))
        ?.replace('lpv__controls__goto--', '');
      if (direction && CONTROL_LABELS[direction]) {
        button.setAttribute('aria-label', CONTROL_LABELS[direction]);
      }
    });
    controls
      .querySelector('.lpv__controls__menu')
      ?.setAttribute('aria-label', 'Game menu');
  }
}
