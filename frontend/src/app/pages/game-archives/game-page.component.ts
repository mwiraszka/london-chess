import {
  ArchiveIconComponent,
  ButtonComponent,
  CardComponent,
  ChevronLeftIconComponent,
  ChevronRightIconComponent,
  MicroscopeIconComponent,
  SkeletonComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';

import { AsyncPipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';

import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { PgnViewerComponent } from '@app/components/pgn-viewer/pgn-viewer.component';
import { PLACEHOLDER_GAME } from '@app/constants/games';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { ExternalLink, Game, Id, InternalLink, LoadStatus } from '@app/models';
import { KEEP_SCROLL, MetaAndTitleService } from '@app/services';
import { GamesActions, GamesSelectors } from '@app/store/games';
import {
  buildPgn,
  formatPartialDate,
  gamesQueryParams,
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

interface GamePosition {
  number: number;
  count: number;
}

const extraOf = (detail: string | number | null): string =>
  detail === null ? '' : String(detail);

function archiveLink(queryParams: Params): InternalLink {
  return {
    text: 'Back to the archives',
    internalPath: 'game-archives',
    queryParams,
    icon: ArchiveIconComponent,
  };
}

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

@UntilDestroy()
@Component({
  selector: 'lcc-game-page',
  templateUrl: './game-page.component.html',
  styleUrl: './game-page.component.scss',
  imports: [
    AsyncPipe,
    ButtonComponent,
    CardComponent,
    ChevronRightIconComponent,
    DecimalPipe,
    LinkListComponent,
    LoadFailedComponent,
    MemberLinkComponent,
    NgTemplateOutlet,
    PageHeaderComponent,
    PgnViewerComponent,
    RouterLink,
    SkeletonComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  protected readonly pageIcon = ArchiveIconComponent;
  protected readonly previousIcon = ChevronLeftIconComponent;
  protected readonly nextIcon = ChevronRightIconComponent;
  protected readonly keepScroll = KEEP_SCROLL;
  protected readonly placeholderView = toGameView(PLACEHOLDER_GAME);

  public viewModel$?: Observable<{
    gameId: Id;
    view: GameView | null;
    status: LoadStatus;
    previousId: Id | null;
    nextId: Id | null;
    position: GamePosition | null;
    archiveLink: InternalLink;
  }>;

  public ngOnInit(): void {
    const gameId$ = this.route.paramMap.pipe(map(params => params.get('id') ?? ''));

    // A game reached by link is not in the store yet
    gameId$
      .pipe(
        switchMap(gameId =>
          this.store.select(GamesSelectors.selectGameById(gameId)).pipe(
            take(1),
            map(game => ({ gameId, game })),
          ),
        ),
        untilDestroyed(this),
      )
      .subscribe(({ gameId, game }) => {
        if (!game) {
          this.store.dispatch(GamesActions.fetchGameRequested({ gameId }));
        }
      });

    this.viewModel$ = gameId$.pipe(
      switchMap(gameId =>
        combineLatest([
          this.store.select(GamesSelectors.selectGameById(gameId)),
          this.store.select(GamesSelectors.selectGameStatus(gameId)),
          this.store.select(GamesSelectors.selectAdjacentGameIds(gameId)),
          this.store.select(GamesSelectors.selectGamePosition(gameId)),
          this.store.select(GamesSelectors.selectQuery),
        ]).pipe(
          map(([game, status, adjacent, position, query]) => ({
            gameId,
            view: game ? toGameView(game) : null,
            status,
            previousId: adjacent.previous,
            nextId: adjacent.next,
            position,
            archiveLink: archiveLink(gamesQueryParams(query)),
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
