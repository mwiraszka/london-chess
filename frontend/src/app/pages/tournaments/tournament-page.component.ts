import {
  AwardIconComponent,
  CardComponent,
  DataTableColumn,
  DataTableComponent,
  NewspaperIconComponent,
  SkeletonComponent,
  TooltipDirective,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { ARCHIVE_SIZING } from '@app/constants/game-archive-sizing';
import { PLACEHOLDER_GAME } from '@app/constants/games';
import { TOURNAMENT_SIZING } from '@app/constants/tournament-sizing';
import {
  LOADING_ENTRY_COUNT,
  LOADING_ROUND_COUNT,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_SUBTITLE_LABELS,
} from '@app/constants/tournaments';
import {
  ExternalLink,
  InternalLink,
  RoundResult,
  Tournament,
  TournamentEntry,
  TournamentGame,
  TournamentSection,
} from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { TournamentsActions, TournamentsSelectors } from '@app/store/tournaments';
import {
  formatDateRange,
  formatScore,
  parseSubtitlePeople,
  playerName,
  playerNameLastFirst,
  roundResultDescription,
  roundResultLabel,
} from '@app/utils';

export interface RoundCell {
  result: RoundResult;
  label: string;
  description: string;
}

// A crosstable row, holding each column's value under its key, each round's included.
// A row stands in for an entry that is still loading when it has none.
export interface CrosstableRow {
  id: string;
  entry: TournamentEntry | null;
  rank: number;
  player: string;
  rating: number | null;
  provisionalGames: number | null;
  score: number | null;
  resultNote: string;
  [round: `round-${number}`]: RoundCell | null;
}

export interface GameRow {
  id: string;
  game: TournamentGame;
  round: string;
  white: string;
  result: string;
  black: string;
}

// A section's heading and whatever qualifies it, such as a simul giver's rating
export interface SectionHeading {
  text: string;
  extra: string;
}

export interface SectionView {
  key: string;
  heading: SectionHeading | null;
  kind: 'crosstable' | 'standings' | 'simul';
  roundCount: number;
  rows: CrosstableRow[];
  games: GameRow[];
}

// Where the club's own site hosts a tournament report, it opens here as an article
const SITE_ARTICLE_URL = /^https:\/\/londonchess\.ca\/article\/view\/([\da-f]{24})$/;

const roundKey = (round: number): `round-${number}` => `round-${round}`;

function cycle<T>(items: T[], index: number, fallback: T): T {
  return items.length ? items[index % items.length] : fallback;
}

// Rows holding the widest content each crosstable column shows in any tournament,
// shared by every crosstable on the page so their columns line up
const SIZING_ROWS: CrosstableRow[] = (() => {
  const {
    players,
    resultNotes,
    maxRounds,
    maxSectionPlayers,
    maxRating,
    maxProvisionalGames,
    maxScore,
  } = TOURNAMENT_SIZING;
  const widestResult: RoundResult = {
    round: 1,
    outcome: 'game',
    scores: [1, 0],
    points: 1,
    opponentRank: maxSectionPlayers,
    color: null,
    gameId: null,
  };
  const count = Math.max(players.length, resultNotes.length);

  return Array.from({ length: count }, (_, index) => {
    const row: CrosstableRow = {
      id: `sizing-${index}`,
      entry: null,
      rank: maxSectionPlayers,
      player: playerNameLastFirst({
        ...PLACEHOLDER_GAME.white,
        ...cycle(players, index, PLACEHOLDER_GAME.white),
      }),
      rating: maxRating,
      provisionalGames: maxProvisionalGames,
      score: Math.floor(maxScore) + 0.5,
      resultNote: cycle(resultNotes, index, ''),
    };
    for (let round = 1; round <= maxRounds; round++) {
      row[roundKey(round)] = {
        result: widestResult,
        label: roundResultLabel(widestResult),
        description: '',
      };
    }
    return row;
  });
})();

const LOADING_ROWS: CrosstableRow[] = Array.from(
  { length: LOADING_ENTRY_COUNT },
  (_, index) => ({ ...SIZING_ROWS[0], id: `loading-${index}`, entry: null }),
);

const GAME_SIZING_ROWS: GameRow[] = ARCHIVE_SIZING.players.map((player, index) => {
  const white = { ...PLACEHOLDER_GAME.white, ...player };
  const black = {
    ...PLACEHOLDER_GAME.black,
    ...cycle(ARCHIVE_SIZING.players, index + 1, player),
  };
  const round = String(TOURNAMENT_SIZING.maxRounds);
  return {
    id: `sizing-${index}`,
    game: { ...PLACEHOLDER_GAME, id: `sizing-${index}`, round, white, black },
    round,
    white: playerName(white),
    result: '1/2-1/2',
    black: playerName(black),
  };
});

// A simul's sections are its givers, shown with the rating recorded beside each
function sectionHeading(section: TournamentSection): SectionHeading | null {
  if (section.ratingBand) {
    return { text: section.ratingBand, extra: '' };
  }
  if (!section.name) {
    return null;
  }
  const [giver] = parseSubtitlePeople(section.name)?.people ?? [];
  return giver
    ? { text: giver.name, extra: giver.rating === null ? '' : String(giver.rating) }
    : { text: section.name, extra: '' };
}

function sectionKind(
  tournament: Tournament,
  section: TournamentSection,
): SectionView['kind'] {
  if (tournament.format === 'tandem-simul') {
    return 'simul';
  }
  return section.entries.some(({ rounds }) => rounds.length) ? 'crosstable' : 'standings';
}

function toSectionView(
  tournament: Tournament,
  section: TournamentSection,
  index: number,
): SectionView {
  const byRank = new Map(section.entries.map(entry => [entry.rank, entry]));
  const roundCount = Math.max(
    section.roundCount,
    ...section.entries.flatMap(({ rounds }) => rounds.map(({ round }) => round)),
  );

  return {
    key: `${index}-${section.name}`,
    heading: sectionHeading(section),
    kind: sectionKind(tournament, section),
    roundCount,
    rows: section.entries.map((entry, entryIndex) => {
      const row: CrosstableRow = {
        id: `${entryIndex}-${entry.player.id}`,
        entry,
        rank: entry.rank,
        player: playerNameLastFirst(entry.player),
        rating: entry.rating,
        provisionalGames: entry.provisionalGames,
        score: entry.score,
        resultNote: entry.resultNote,
      };
      for (let round = 1; round <= roundCount; round++) {
        const result = entry.rounds.find(played => played.round === round);
        const opponent =
          result?.opponentRank != null ? (byRank.get(result.opponentRank) ?? null) : null;
        row[roundKey(round)] = result
          ? {
              result,
              label: roundResultLabel(result),
              description: roundResultDescription(result, opponent),
            }
          : null;
      }
      return row;
    }),
    games: section.games.map(game => ({
      id: game.id,
      game,
      round: game.round,
      white: playerName(game.white),
      result: game.result,
      black: playerName(game.black),
    })),
  };
}

type CellTemplate<T> = TemplateRef<{ $implicit: T; value: unknown }>;

@UntilDestroy()
@Component({
  selector: 'lcc-tournament-page',
  templateUrl: './tournament-page.component.html',
  styleUrl: './tournament-page.component.scss',
  imports: [
    CardComponent,
    DataTableComponent,
    LinkListComponent,
    LoadFailedComponent,
    MemberLinkComponent,
    PageHeaderComponent,
    RouterLink,
    SkeletonComponent,
    TextSkeletonComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentPageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  private readonly rankCell = viewChild<CellTemplate<CrosstableRow>>('rankCell');
  private readonly playerCell = viewChild<CellTemplate<CrosstableRow>>('playerCell');
  private readonly ratingCell = viewChild<CellTemplate<CrosstableRow>>('ratingCell');
  private readonly roundCell = viewChild<CellTemplate<CrosstableRow>>('roundCell');
  private readonly scoreCell = viewChild<CellTemplate<CrosstableRow>>('scoreCell');
  private readonly noteCell = viewChild<CellTemplate<CrosstableRow>>('noteCell');
  private readonly whiteCell = viewChild<CellTemplate<GameRow>>('whiteCell');
  private readonly blackCell = viewChild<CellTemplate<GameRow>>('blackCell');
  private readonly resultCell = viewChild<CellTemplate<GameRow>>('resultCell');

  protected readonly pageIcon = AwardIconComponent;
  protected readonly formatLabels = TOURNAMENT_FORMAT_LABELS;
  protected readonly subtitleLabels = TOURNAMENT_SUBTITLE_LABELS;
  protected readonly formatDateRange = formatDateRange;
  protected readonly formatScore = formatScore;
  protected readonly archiveLink: InternalLink = {
    text: 'Back to tournaments',
    internalPath: 'tournaments',
    icon: AwardIconComponent,
  };

  protected readonly sizingRows = SIZING_ROWS;
  protected readonly loadingRows = LOADING_ROWS;
  protected readonly gameSizingRows = GAME_SIZING_ROWS;

  private readonly tournamentNumber$ = this.route.paramMap.pipe(
    map(params => Number(params.get('number'))),
  );

  protected readonly viewModel = toSignal(
    this.tournamentNumber$.pipe(
      switchMap(tournamentNumber =>
        combineLatest([
          this.store.select(
            TournamentsSelectors.selectTournamentByNumber(tournamentNumber),
          ),
          this.store.select(
            TournamentsSelectors.selectTournamentStatus(tournamentNumber),
          ),
        ]).pipe(
          map(([tournament, status]) => ({ tournamentNumber, tournament, status })),
        ),
      ),
    ),
  );

  protected readonly sections = computed<SectionView[]>(() => {
    const tournament = this.viewModel()?.tournament;
    return tournament
      ? tournament.sections.map((section, index) =>
          toSectionView(tournament, section, index),
        )
      : [];
  });

  protected readonly playerCount = computed(
    () =>
      new Set(
        this.viewModel()?.tournament?.sections.flatMap(({ entries }) =>
          entries.map(({ player }) => player.id),
        ),
      ).size,
  );

  // The people a subtitle names, shown with their ratings set apart
  protected readonly subtitlePeople = computed(() =>
    parseSubtitlePeople(this.viewModel()?.tournament?.subtitle ?? ''),
  );

  protected readonly links = computed<(InternalLink | ExternalLink)[]>(() => {
    const articleUrl = this.viewModel()?.tournament?.articleUrl;
    if (!articleUrl) {
      return [this.archiveLink];
    }
    const articleId = articleUrl.match(SITE_ARTICLE_URL)?.[1];
    const articleLink: InternalLink | ExternalLink = articleId
      ? {
          text: 'See article',
          internalPath: ['article', 'view', articleId],
          icon: NewspaperIconComponent,
        }
      : { text: 'See article', externalPath: articleUrl, icon: NewspaperIconComponent };
    return [articleLink, this.archiveLink];
  });

  protected readonly sectionColumns = computed(
    () =>
      new Map(
        this.sections().map(section => [
          section.key,
          this.crosstableColumns(section.kind, section.roundCount),
        ]),
      ),
  );

  protected readonly loadingColumns = computed(() =>
    this.crosstableColumns('crosstable', LOADING_ROUND_COUNT),
  );

  protected readonly gameColumns = computed<DataTableColumn<GameRow>[]>(() => {
    const white = this.whiteCell();
    const black = this.blackCell();
    const result = this.resultCell();
    if (!white || !black || !result) {
      return [];
    }
    return [
      { key: 'round', label: 'Round', align: 'right' },
      { key: 'white', label: 'White', cellTemplate: white },
      { key: 'result', label: 'Result', align: 'center', cellTemplate: result },
      { key: 'black', label: 'Black', cellTemplate: black },
    ];
  });

  protected readonly gameHref = ({ game }: GameRow): string =>
    `/game-archives/${game.id}`;

  public ngOnInit(): void {
    this.tournamentNumber$
      .pipe(
        switchMap(tournamentNumber =>
          this.store.select(
            TournamentsSelectors.selectTournamentByNumber(tournamentNumber),
          ),
        ),
        untilDestroyed(this),
      )
      .subscribe(tournament => {
        const days = tournament
          ? formatDateRange(tournament.date, tournament.endDate)
          : '';
        this.metaAndTitleService.updateTitle(
          tournament ? `${tournament.name}, ${days}` : 'Tournament',
        );
        this.metaAndTitleService.updateDescription(
          tournament
            ? `Standings from the London Chess Club's ${tournament.name}, ${days}.`
            : 'A tournament from the London Chess Club archives.',
        );
      });
  }

  public onOpenGame({ game }: GameRow): void {
    this.router.navigate(['/game-archives', game.id]);
  }

  public onRetry(tournamentNumber: number): void {
    this.store.dispatch(
      TournamentsActions.fetchTournamentRequested({ tournamentNumber }),
    );
  }

  private crosstableColumns(
    kind: SectionView['kind'],
    roundCount: number,
  ): DataTableColumn<CrosstableRow>[] {
    const rank = this.rankCell();
    const player = this.playerCell();
    const rating = this.ratingCell();
    const round = this.roundCell();
    const score = this.scoreCell();
    const note = this.noteCell();
    if (!rank || !player || !rating || !round || !score || !note) {
      return [];
    }

    const leading: DataTableColumn<CrosstableRow>[] = [
      {
        key: 'rank',
        label: kind === 'simul' ? 'Board' : '#',
        sortable: true,
        align: 'right',
        cellTemplate: rank,
      },
      { key: 'player', label: 'Name', sortable: true, cellTemplate: player },
      {
        key: 'rating',
        label: 'Rating',
        sortable: true,
        align: 'right',
        cellTemplate: rating,
      },
    ];
    const rounds = Array.from(
      { length: kind === 'crosstable' ? roundCount : 0 },
      (_, index): DataTableColumn<CrosstableRow> => ({
        key: roundKey(index + 1),
        label: `Rd ${index + 1}`,
        align: 'center',
        cellTemplate: round,
      }),
    );
    const trailing: DataTableColumn<CrosstableRow>[] =
      kind === 'simul'
        ? [{ key: 'resultNote', label: 'Result', sortable: true, cellTemplate: note }]
        : [
            {
              key: 'score',
              label: 'Total',
              sortable: true,
              align: 'right',
              cellTemplate: score,
            },
          ];
    return [...leading, ...rounds, ...trailing];
  }
}
