import {
  ArchiveIconComponent,
  ButtonComponent,
  CardComponent,
  ChevronLeftIconComponent,
  ChevronRightIconComponent,
  SkeletonComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';

import { AsyncPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';

import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { PgnViewerComponent } from '@app/components/pgn-viewer/pgn-viewer.component';
import { PLACEHOLDER_GAME } from '@app/constants/games';
import { Game, Id, InternalLink, LoadStatus } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { GamesActions, GamesSelectors } from '@app/store/games';
import { formatPartialDate, gamesQueryParams, playerName, resultLabel } from '@app/utils';

interface GameView {
  game: Game;
  heading: string;
  event: string;
  date: string;
  whiteName: string;
  whiteRating: string;
  blackName: string;
  blackRating: string;
  result: string;
  opening: string;
  moveCount: number;
}

interface GamePosition {
  number: number;
  count: number;
}

const inParentheses = (detail: string | number | null): string =>
  detail === null || detail === '' ? '' : ` (${detail})`;

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
    event: `${game.tournament || 'Unknown event'}${inParentheses(game.section)}`,
    date: `${formatPartialDate(game.date)}${inParentheses(game.round && `Round ${game.round}`)}`,
    whiteName,
    whiteRating: inParentheses(game.whiteElo),
    blackName,
    blackRating: inParentheses(game.blackElo),
    result: `${game.result === '1/2-1/2' ? '½-½' : game.result} (${resultLabel(game.result)})`,
    opening: game.opening ? `${game.opening}${inParentheses(game.eco)}` : game.eco,
    moveCount: Math.ceil(game.plyCount / 2),
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
    PageHeaderComponent,
    PgnViewerComponent,
    RouterLink,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  protected readonly pageIcon = ArchiveIconComponent;
  protected readonly previousIcon = ChevronLeftIconComponent;
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
