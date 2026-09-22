import {
  ArchiveIconComponent,
  CardComponent,
  MicroscopeIconComponent,
  SkeletonComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { PgnViewerComponent } from '@app/components/pgn-viewer/pgn-viewer.component';
import { PLACEHOLDER_GAME } from '@app/constants/games';
import { ExternalLink, Game, Id, InternalLink, LoadStatus } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { GamesActions, GamesSelectors } from '@app/store/games';
import {
  buildPgn,
  formatPartialDate,
  getLichessAnalysisUrl,
  playerName,
  resultLabel,
} from '@app/utils';

// A detail and whatever qualifies it, shown in parentheses after it
interface Detail {
  text: string;
  extra: string;
}

interface GameView {
  game: Game;
  heading: string;
  event: Detail;
  date: Detail;
  whiteName: string;
  whiteRating: string;
  blackName: string;
  blackRating: string;
  result: Detail;
  opening: Detail | null;
  moveCount: number;
  analysisLink: ExternalLink;
}

const extraOf = (detail: string | number | null): string =>
  detail === null ? '' : String(detail);

function toGameView(game: Game): GameView {
  const whiteName = playerName(game.white);
  const blackName = playerName(game.black);
  return {
    game,
    heading: `${whiteName} vs ${blackName}`,
    event: { text: game.tournament || 'Unknown event', extra: game.section },
    date: {
      text: formatPartialDate(game.date),
      extra: game.round ? `Round ${game.round}` : '',
    },
    whiteName,
    whiteRating: extraOf(game.whiteElo),
    blackName,
    blackRating: extraOf(game.blackElo),
    result: {
      text: game.result === '1/2-1/2' ? '½-½' : game.result,
      extra: resultLabel(game.result),
    },
    opening: game.opening
      ? { text: game.opening, extra: game.eco }
      : game.eco
        ? { text: game.eco, extra: '' }
        : null,
    moveCount: Math.ceil(game.plyCount / 2),
    analysisLink: {
      text: 'Analyze game on Lichess',
      externalPath: getLichessAnalysisUrl(buildPgn(game)),
      icon: MicroscopeIconComponent,
    },
  };
}

@Component({
  selector: 'lcc-game-page',
  templateUrl: './game-page.component.html',
  styleUrl: './game-page.component.scss',
  imports: [
    AsyncPipe,
    CardComponent,
    LinkListComponent,
    LoadFailedComponent,
    MemberLinkComponent,
    NgTemplateOutlet,
    PageHeaderComponent,
    PgnViewerComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  protected readonly pageIcon = ArchiveIconComponent;
  protected readonly archiveLink: InternalLink = {
    text: 'Back to the archives',
    internalPath: 'game-archives',
    icon: ArchiveIconComponent,
  };
  protected readonly placeholderView = toGameView(PLACEHOLDER_GAME);

  public viewModel$?: Observable<{
    gameId: Id;
    view: GameView | null;
    status: LoadStatus;
  }>;

  public ngOnInit(): void {
    const gameId$ = this.route.paramMap.pipe(map(params => params.get('id') ?? ''));

    this.viewModel$ = gameId$.pipe(
      switchMap(gameId =>
        combineLatest([
          this.store.select(GamesSelectors.selectGameById(gameId)),
          this.store.select(GamesSelectors.selectGameStatus(gameId)),
        ]).pipe(
          map(([game, status]) => ({
            gameId,
            view: game ? toGameView(game) : null,
            status,
          })),
        ),
      ),
      tap(({ view }) => {
        this.metaAndTitleService.updateTitle(view ? view.heading : 'Game');
        this.metaAndTitleService.updateDescription(
          view
            ? `${view.heading}, ${view.game.tournament || 'London Chess Club'} ${view.game.year}.`
            : 'A game from the London Chess Club archives.',
        );
      }),
    );
  }

  public onRetry(gameId: Id): void {
    this.store.dispatch(GamesActions.fetchGameRequested({ gameId }));
  }
}
