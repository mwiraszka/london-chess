import { MicroscopeIconComponent } from '@eagami/ui';
import LichessPgnViewer from 'lichess-pgn-viewer';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Inject,
  Input,
  OnInit,
  inject,
} from '@angular/core';

import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { ExternalLink } from '@app/models';
import { GET_PLAYER_NAME, GET_SCORE } from '@app/tokens';
import { getLichessAnalysisUrl } from '@app/utils';

@Component({
  selector: 'lcc-pgn-viewer',
  template: `
    <div [id]="viewerId"></div>
    <lcc-link-list [links]="[lichessAnalysisBoardLink]"></lcc-link-list>
  `,
  styles: `
    lcc-link-list {
      margin-top: 4px;
    }
  `,
  imports: [LinkListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PgnViewerComponent implements OnInit, AfterViewInit {
  @Input({ required: true }) public index!: number;
  @Input({ required: true }) public label!: string;
  @Input({ required: true }) public pgn!: string;

  public lichessAnalysisBoardLink!: ExternalLink;
  public viewerId!: string;

  private readonly getScore = inject(GET_SCORE);

  private readonly getPlayerName = inject(GET_PLAYER_NAME);

  constructor(@Inject(DOCUMENT) private _document: Document) {}

  public ngOnInit(): void {
    this.viewerId = `pgn-viewer--${this.label}--${this.index}`;

    this.lichessAnalysisBoardLink = {
      text: 'Analyze game on Lichess',
      externalPath: getLichessAnalysisUrl(this.pgn),
      icon: MicroscopeIconComponent,
    };
  }

  public ngAfterViewInit(): void {
    const container = this._document.getElementById(this.viewerId);

    if (container) {
      LichessPgnViewer(container, {
        classes: this.viewerId, // Required for query selectors below
        initialPly: 1,
        orientation: 'white',
        pgn: this.pgn,
        showClocks: false,
      });

      const whiteScore = this.getScore(this.pgn, 'White');
      if (!whiteScore) {
        console.warn('[LCC] Found game with an invalid score for White: \n', this.pgn);
        return;
      }

      const blackScore = this.getScore(this.pgn, 'Black');
      if (!blackScore) {
        console.warn('[LCC] Found game with an invalid score for Black: \n', this.pgn);
        return;
      }

      const whiteName = this.getPlayerName(this.pgn, 'full', 'White');
      if (!whiteName) {
        console.warn('[LCC] Found game with an undefined White player: \n', this.pgn);
        return;
      }

      const blackName = this.getPlayerName(this.pgn, 'full', 'Black');
      if (!blackName) {
        console.warn('[LCC] Found game with an undefined Black player: \n', this.pgn);
        return;
      }

      const whitePlayerElement = this._document.querySelector(
        `.${this.viewerId} .lpv__player--bottom > .lpv__player__person`,
      );
      const blackPlayerElement = this._document.querySelector(
        `.${this.viewerId} .lpv__player--top > .lpv__player__person`,
      );

      whitePlayerElement?.setAttribute('data-name', whiteName);
      whitePlayerElement?.setAttribute('data-score', whiteScore);

      blackPlayerElement?.setAttribute('data-name', blackName);
      blackPlayerElement?.setAttribute('data-score', blackScore);
    }
  }
}
