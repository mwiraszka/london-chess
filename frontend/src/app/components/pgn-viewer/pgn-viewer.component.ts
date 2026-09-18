import LichessPgnViewer from 'lichess-pgn-viewer';

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  viewChild,
} from '@angular/core';

import { Game } from '@app/models';
import { buildPgn, playerName, playerScores } from '@app/utils';

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

  constructor() {
    effect(() => this.render(this.game(), this.board().nativeElement));
  }

  private render(game: Game, container: HTMLElement): void {
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
  }
}
