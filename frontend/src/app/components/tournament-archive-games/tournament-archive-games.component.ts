import {
  AlertComponent,
  ButtonComponent,
  CardComponent,
  CheckboxComponent,
  DropdownComponent,
  InputComponent,
  SelectOption,
  SkeletonComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import {
  ArchiveGameCount,
  ArchiveGamesReview,
  ArchivedGameSummary,
  Id,
  LoadStatus,
  UnlinkedPairing,
} from '@app/models';
import { TournamentsApiService } from '@app/services';
import { TournamentsActions } from '@app/store/tournaments';
import { formatPartialDate, parseError, playerName } from '@app/utils';

// A pairing keeps one identity while the game tied to it is being chosen
const pairingKey = ({ section, round, players }: UnlinkedPairing): string =>
  [section, round, ...players.map(({ id }) => id)].join('|');

function describeGame(game: ArchivedGameSummary): string {
  const section = game.section ? ` (${game.section})` : '';
  return `${game.tournament}${section}, round ${game.round || '?'}, ${formatPartialDate(game.date, 'short')}: ${playerName(game.white)} v ${playerName(game.black)}, ${game.result}`;
}

/**
 * Lines a recorded tournament's results up with its games in the archive: ties a round the
 * standings record, but no archived game matches by its filing, to the game it was, and
 * marks the tournament's archived games that its results leave out as not counted.
 */
@Component({
  selector: 'lcc-tournament-archive-games',
  templateUrl: './tournament-archive-games.component.html',
  styleUrl: './tournament-archive-games.component.scss',
  imports: [
    AlertComponent,
    ButtonComponent,
    CardComponent,
    CheckboxComponent,
    DropdownComponent,
    InputComponent,
    LoadFailedComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentArchiveGamesComponent implements OnInit {
  public readonly tournamentNumber = input.required<number>();

  private readonly store = inject(Store);
  private readonly tournamentsApiService = inject(TournamentsApiService);

  protected readonly status = signal<LoadStatus>('loading');
  protected readonly review = signal<ArchiveGamesReview | null>(null);
  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);
  protected readonly saved = signal(false);

  // The archived game chosen for each pairing
  protected readonly links = signal<ReadonlyMap<string, Id>>(new Map());
  // Whether each archived game counts, as changed here
  protected readonly counts = signal<ReadonlyMap<Id, ArchiveGameCount>>(new Map());

  protected readonly pairings = computed(() =>
    (this.review()?.unlinked ?? [])
      .filter(({ candidates }) => candidates.length)
      .map(pairing => ({
        key: pairingKey(pairing),
        pairing,
        label: `${pairing.section ? `${pairing.section}, ` : ''}round ${pairing.round}: ${pairing.players.map(playerName).join(' v ')}`,
        options: pairing.candidates.map((game): SelectOption => ({
          value: game.id,
          label: describeGame(game),
        })),
      })),
  );

  // Rounds without moves to archive outnumber the others, so they are only counted
  protected readonly gamelessCount = computed(
    () =>
      (this.review()?.unlinked ?? []).filter(({ candidates }) => !candidates.length)
        .length,
  );

  protected readonly unplaced = computed(() =>
    (this.review()?.unplaced ?? []).map(game => {
      const edited = this.counts().get(game.id);
      return {
        id: game.id,
        label: describeGame(game),
        notCounted: edited?.notCounted ?? game.notCounted,
        notCountedReason: edited?.notCountedReason ?? game.notCountedReason,
      };
    }),
  );

  protected readonly hasChanges = computed(
    () => this.links().size > 0 || this.counts().size > 0,
  );

  public ngOnInit(): void {
    void this.load();
  }

  public async load(): Promise<void> {
    this.status.set('loading');
    try {
      const { data } = await firstValueFrom(
        this.tournamentsApiService.getArchiveGames(this.tournamentNumber()),
      );
      this.review.set(data);
      this.status.set('loaded');
    } catch {
      this.status.set('failed');
    }
  }

  public onLinkChosen(key: string, gameId: string): void {
    this.saved.set(false);
    this.links.update(links => {
      const next = new Map(links);
      if (gameId) {
        next.set(key, gameId);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  public onCountChanged(
    gameId: Id,
    change: Partial<Omit<ArchiveGameCount, 'gameId'>>,
  ): void {
    const game = this.unplaced().find(({ id }) => id === gameId);
    if (!game) {
      return;
    }
    this.saved.set(false);
    this.counts.update(counts =>
      new Map(counts).set(gameId, {
        gameId,
        notCounted: change.notCounted ?? game.notCounted,
        notCountedReason: change.notCountedReason ?? game.notCountedReason,
      }),
    );
  }

  public async onSave(): Promise<void> {
    const links = this.pairings().flatMap(({ key, pairing }) => {
      const gameId = this.links().get(key);
      return gameId
        ? [
            {
              gameId,
              section: pairing.section,
              round: pairing.round,
              playerIds: pairing.players.map(({ id }) => id),
            },
          ]
        : [];
    });

    this.saving.set(true);
    this.problem.set(null);
    try {
      const { data } = await firstValueFrom(
        this.tournamentsApiService.updateArchiveGames(this.tournamentNumber(), {
          links,
          counts: [...this.counts().values()],
        }),
      );
      this.review.set(data);
      this.links.set(new Map());
      this.counts.set(new Map());
      this.saved.set(true);
      // The tournament's page links its rounds to the games tied here
      this.store.dispatch(
        TournamentsActions.fetchTournamentRequested({
          tournamentNumber: this.tournamentNumber(),
        }),
      );
    } catch (error) {
      this.problem.set(parseError(error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
