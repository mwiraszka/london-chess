import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  CheckboxComponent,
  DataTableColumn,
  DatePickerComponent,
  DialogService,
  DividerComponent,
  DropdownComponent,
  FileUploaderComponent,
  InputComponent,
  NumberInputComponent,
  SwitchComponent,
  TimePickerComponent,
} from '@eagami/ui';
import { Subject, firstValueFrom, merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { DataTableComponent } from '@app/components/data-table/data-table.component';
import { FormActionsComponent } from '@app/components/form-actions/form-actions.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { CLUB_TIME_ZONE } from '@app/constants/clubs';
import {
  FORM_CHANGE_DEBOUNCE,
  FORM_ERROR_MESSAGES,
  WEEK_STARTS_ON,
} from '@app/constants/forms';
import {
  MAX_LISTED_IMPORT_PROBLEMS,
  MAX_ROUND_COUNT,
  TOURNAMENT_FORMAT_OPTIONS,
} from '@app/constants/tournaments';
import {
  ArchivedGameSummary,
  BasicDialogResult,
  Dialog,
  GameInput,
  Id,
  ImportChanges,
  ImportPreview,
  ImportPreviewRow,
  Member,
  PlayerNameMatch,
  SectionInput,
  Tournament,
  TournamentFormData,
  TournamentFormGroup,
  TournamentFormValue,
} from '@app/models';
import {
  MembersApiService,
  StandingsFileService,
  StoreRequestService,
  TournamentsApiService,
} from '@app/services';
import { TournamentsActions } from '@app/store/tournaments';
import {
  draftDebounce,
  formatPartialDate,
  formatScore,
  fromClubDateTime,
  fromDayString,
  parseError,
  playerName,
  playerNameLastFirst,
  roundResultLabel,
  toClubDateTime,
  toDayString,
  tournamentFormData,
} from '@app/utils';
import moment from '@app/utils/datetime/moment';
import {
  closesAfterOpensValidator,
  idValidator,
  notBeforeDayValidator,
  roundCountValidator,
  textValidator,
  timeControlValidator,
} from '@app/validators';

const PGN_FILE = /\.(pgn|txt)$/i;

// The choice that adds a PGN game as a new game rather than any archived one
const NEW_GAME = 'new';

// A PGN game keeps one identity while its archived copy is being decided
const gameKey = ({ section, round, whitePlayerId, blackPlayerId }: GameInput): string =>
  [section, round, whitePlayerId, blackPlayerId].join('|');

@Component({
  selector: 'lcc-tournament-form',
  templateUrl: './tournament-form.component.html',
  styleUrl: './tournament-form.component.scss',
  imports: [
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    CheckboxComponent,
    DataTableComponent,
    DatePickerComponent,
    DividerComponent,
    DropdownComponent,
    FileUploaderComponent,
    FormActionsComponent,
    InputComponent,
    ModificationInfoComponent,
    NumberInputComponent,
    ReactiveFormsModule,
    SwitchComponent,
    TimePickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly saved = new Subject<void>();
  private readonly dialogService = inject(DialogService);
  private readonly standingsFileService = inject(StandingsFileService);
  private readonly storeRequests = inject(StoreRequestService);
  private readonly tournamentsApiService = inject(TournamentsApiService);
  private readonly membersApiService = inject(MembersApiService);

  readonly formData = input.required<TournamentFormData>();
  readonly hasUnsavedChanges = input.required<boolean>();
  readonly originalTournament = input.required<Tournament | null>();

  readonly cancel = output<void>();
  readonly change = output<{
    tournamentNumber: number | null;
    formData: Partial<TournamentFormData>;
  }>();
  readonly restore = output<number | null>();

  private readonly playerCell =
    viewChild<TemplateRef<{ $implicit: ImportPreviewRow; value: unknown }>>('playerCell');

  protected readonly errorMessages = FORM_ERROR_MESSAGES;
  protected readonly formatOptions = TOURNAMENT_FORMAT_OPTIONS;
  protected readonly maxRoundCount = MAX_ROUND_COUNT;
  protected readonly weekStartsOn = WEEK_STARTS_ON;

  // Results read from a file but not yet saved; null keeps the recorded ones
  protected readonly importedSections = signal<SectionInput[] | null>(null);
  // Games from a PGN waiting to be saved: the ones the archive lacks or holds differently;
  // null when no PGN was imported
  protected readonly importedGames = signal<GameInput[] | null>(null);
  // What saving the import would change, as the server works it out for a saved tournament
  protected readonly importChanges = signal<ImportChanges | null>(null);
  protected readonly importProblems = signal<string[]>([]);
  protected readonly importing = signal(false);
  protected readonly checking = signal(false);
  protected readonly standingsFiles = signal<readonly File[]>([]);
  protected readonly playerMatches = signal<PlayerNameMatch[]>([]);
  protected readonly playerCheckFailed = signal(false);

  // The games the last check compared, in the order of its answer
  private readonly checkedGames = signal<GameInput[]>([]);
  // Every game a newly read PGN holds, before the check keeps only those that change
  private readonly pgnGames = signal<GameInput[]>([]);
  // The names the PGN gives its players, by archive player
  private readonly pgnPlayerNames = signal<Record<Id, string>>({});
  // The archived games each new game was found to perhaps be, by game, kept once offered so
  // a choice can still be changed after it is made
  private readonly offeredCandidates = signal<ReadonlyMap<string, ArchivedGameSummary[]>>(
    new Map(),
  );
  // The games chosen to be added as new rather than taken for any archived game
  private readonly chosenNew = signal<ReadonlySet<string>>(new Set());

  // Every member, for linking a name the archive cannot place to the member it belongs to
  protected readonly members = signal<Pick<Member, 'id' | 'firstName' | 'lastName'>[]>(
    [],
  );
  protected readonly linkingName = signal<string | null>(null);
  protected readonly linkProblem = signal<string | null>(null);

  private readonly playerNames = computed(() => {
    const names = new Map<string, string>(
      (this.originalTournament()?.sections ?? []).flatMap(({ entries }) =>
        entries.map(({ player }) => [player.id, playerName(player)] as const),
      ),
    );
    for (const [id, name] of Object.entries(this.pgnPlayerNames())) {
      names.set(id, name);
    }
    return names;
  });

  private describeGame(game: GameInput): string {
    const name = (id: Id) => this.playerNames().get(id) ?? 'a player';
    const section = game.section ? `${game.section}, ` : '';
    return `${section}round ${game.round}: ${name(game.whitePlayerId)} v ${name(game.blackPlayerId)}`;
  }

  // Each new game that could be an archived one, waiting to be told which or that it is new
  protected readonly gameChoices = computed(() => {
    const offered = this.offeredCandidates();
    const chosenNew = this.chosenNew();
    return (this.importedGames() ?? []).flatMap(game => {
      const candidates = offered.get(gameKey(game));
      if (!candidates?.length) {
        return [];
      }
      return [
        {
          key: gameKey(game),
          label: this.describeGame(game),
          value: game.archivedGameId ?? (chosenNew.has(gameKey(game)) ? NEW_GAME : ''),
          options: [
            { value: NEW_GAME, label: 'A new game for the archive' },
            ...candidates.map(candidate => ({
              value: candidate.id,
              label: `${candidate.tournament}${candidate.section ? ` (${candidate.section})` : ''}, round ${candidate.round || '?'}, ${formatPartialDate(candidate.date, 'short')}: ${playerName(candidate.white)} v ${playerName(candidate.black)}, ${candidate.result}`,
            })),
          ],
        },
      ];
    });
  });

  protected readonly undecidedGameCount = computed(
    () => this.gameChoices().filter(({ value }) => !value).length,
  );

  // The games the standings leave unplayed, archived as played but not counted
  protected readonly uncountedGames = computed(() =>
    (this.importedGames() ?? [])
      .filter(({ notCounted }) => notCounted)
      .map(game => ({
        key: gameKey(game),
        label: this.describeGame(game),
        reason: game.notCountedReason,
      })),
  );

  // New names that belong to no member, any of which may be another name of one
  protected readonly unlinkedNames = computed(() =>
    this.playerMatches()
      .filter(({ playerId, memberId }) => playerId === null && memberId === null)
      .map(({ name }) => name),
  );

  // The member chosen for each name, waiting to be given it
  protected readonly chosenMembers = signal<ReadonlyMap<string, Id>>(new Map());

  protected readonly memberOptions = computed(() =>
    this.members()
      .map(({ id, firstName, lastName }) => ({
        value: id,
        label: `${firstName} ${lastName}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  protected readonly gameChanges = computed(() => {
    const changes = this.importChanges();
    if (!changes?.games.length) {
      return null;
    }
    const names = new Map(
      (this.originalTournament()?.sections ?? []).flatMap(({ entries }) =>
        entries.map(({ player }) => [player.id, playerNameLastFirst(player)] as const),
      ),
    );
    const games = this.checkedGames();
    return {
      added: changes.games.filter(change => change === 'new').length,
      updated: games
        .filter((_, index) => changes.games[index] === 'changed')
        .map(
          game =>
            `round ${game.round}, ${names.get(game.whitePlayerId)} v ${names.get(game.blackPlayerId)}`,
        ),
      unchanged: changes.games.filter(change => change === 'unchanged').length,
    };
  });

  protected readonly nothingChanges = computed(() => {
    const changes = this.importChanges();
    return (
      !!changes &&
      !changes.sectionChanges.some(Boolean) &&
      !changes.removedSections.length &&
      changes.games.every(change => change === 'unchanged')
    );
  });

  protected readonly isPgnImport = computed(() =>
    this.standingsFiles().some(file => PGN_FILE.test(file.name)),
  );

  protected readonly listedProblems = computed(() =>
    this.importProblems().slice(0, MAX_LISTED_IMPORT_PROBLEMS),
  );
  protected readonly unlistedProblemCount = computed(() =>
    Math.max(0, this.importProblems().length - MAX_LISTED_IMPORT_PROBLEMS),
  );

  protected readonly newPlayers = computed(() =>
    this.playerMatches()
      .filter(({ playerId }) => playerId === null)
      .map(({ name }) => name),
  );

  protected readonly newPlayersNote = computed(() => {
    const count = this.newPlayers().length;
    const players = count === 1 ? 'One player is' : `${count} players are`;
    return `${players} not in the archive yet and will be added when the results are saved. Check the spelling of any marked New below before saving.`;
  });

  // Each of several sections needs a name no other section has
  protected readonly sectionNameErrors = computed(() => {
    const sections = this.importedSections() ?? [];
    return sections.map(({ name }, index) => {
      const trimmed = name.trim();
      if (sections.length > 1 && !trimmed) {
        return 'Name each section, as there is more than one';
      }
      return sections.some((other, at) => at !== index && other.name.trim() === trimmed)
        ? 'Another section already has this name'
        : null;
    });
  });

  protected readonly recordedResults = computed(() => {
    const sections = this.originalTournament()?.sections ?? [];
    const players = new Set(
      sections.flatMap(({ entries }) => entries.map(({ player }) => player.id)),
    ).size;
    if (!players) {
      return null;
    }
    const sectionText =
      sections.length === 1 ? '1 section' : `${sections.length} sections`;
    return `${sectionText}, ${players === 1 ? '1 player' : `${players} players`}`;
  });

  protected readonly previews = computed<ImportPreview[]>(() => {
    const playerCell = this.playerCell();
    const newPlayers = new Set(this.newPlayers());
    const changes = this.importChanges();
    return (this.importedSections() ?? []).flatMap((section, index) =>
      changes && !changes.sectionChanges[index]
        ? []
        : [
            {
              key: `${index}`,
              index,
              section,
              columns: [
                { key: 'rank', label: '#', align: 'right' },
                {
                  key: 'player',
                  label: 'Player',
                  ...(playerCell ? { cellTemplate: playerCell } : {}),
                },
                { key: 'rating', label: 'Rating', align: 'right' },
                ...Array.from(
                  { length: section.roundCount },
                  (_, round): DataTableColumn<ImportPreviewRow> => ({
                    key: `round-${round + 1}`,
                    label: `Rd ${round + 1}`,
                    align: 'center',
                  }),
                ),
                { key: 'score', label: 'Total', align: 'right' },
              ],
              rows: section.entries.map(entry => {
                const row: ImportPreviewRow = {
                  id: `${index}-${entry.rank}`,
                  rank: entry.rank,
                  player: entry.name,
                  isNewPlayer: newPlayers.has(entry.name),
                  rating:
                    entry.rating === null
                      ? 'Unrated'
                      : `${entry.rating}${entry.provisionalGames ? `/${entry.provisionalGames}` : ''}`,
                  score: formatScore(entry.score),
                };
                for (let round = 1; round <= section.roundCount; round++) {
                  const result = entry.rounds.find(played => played.round === round);
                  row[`round-${round}`] = result ? roundResultLabel(result) : '';
                }
                return row;
              }),
            },
          ],
    );
  });

  public form!: FormGroup<TournamentFormGroup>;

  private readonly sectionEdits = new Subject<void>();
  private importAttempt = 0;
  private checkAttempt = 0;

  public ngOnInit(): void {
    this.form = this.buildForm(this.formData());
    this.importedSections.set(this.formData().sections);
    // Drafts kept from before games could be imported have none
    this.importedGames.set(this.formData().games ?? null);
    this.syncRegistrationControls(this.form.controls.hasRegistration.value);
    this.showRegistrationDefaults();
    this.form.controls.endDate.updateValueAndValidity();
    this.form.controls.registrationClosesTime.updateValueAndValidity();

    this.form.controls.hasRegistration.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(hasRegistration => this.syncRegistrationControls(hasRegistration));
    this.form.controls.date.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.form.controls.endDate.updateValueAndValidity();
        this.showRegistrationDefaults();
      });
    merge(
      this.form.controls.registrationOpensDay.valueChanges,
      this.form.controls.registrationOpensTime.valueChanges,
      this.form.controls.registrationClosesDay.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() =>
        this.form.controls.registrationClosesTime.updateValueAndValidity(),
      );

    merge(this.form.valueChanges, this.sectionEdits)
      .pipe(draftDebounce(this.saved), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitChange());
    // A renamed section or rating band changes what saving would do, so it is checked again
    this.sectionEdits
      .pipe(debounceTime(FORM_CHANGE_DEBOUNCE), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.checkImport());
    this.emitChange();

    if (this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
    }
    const sections = this.importedSections();
    if (sections) {
      void this.checkPlayers(sections);
      void this.checkImport();
    }
  }

  public async onStandingsChosen(files: readonly File[]): Promise<void> {
    if (!files.length) {
      this.onClearImport();
      return;
    }
    // A file chosen under the name of one already listed, such as a corrected export, takes
    // its place once confirmed
    const replaced = this.namesakesOf(files);
    if (replaced.length && !(await this.confirmReplacing(replaced))) {
      this.standingsFiles.set([...this.standingsFiles()]);
      return;
    }
    const chosen = files.filter(file => !replaced.includes(file));
    this.standingsFiles.set(chosen);
    const attempt = ++this.importAttempt;

    this.importing.set(true);
    const { sections, games, playerNames, problems } =
      await this.standingsFileService.importStandings(chosen, this.originalTournament());
    // A later choice of files replaces this one
    if (attempt !== this.importAttempt) {
      return;
    }
    this.importing.set(false);
    this.importProblems.set(problems);
    if (problems.length) {
      return;
    }
    this.pgnGames.set(this.isPgnImport() ? games : []);
    this.importedGames.set(this.isPgnImport() ? games : null);
    this.pgnPlayerNames.set(playerNames);

    const known = [
      ...(this.importedSections() ?? []),
      ...(this.originalTournament()?.sections ?? []),
    ];
    const imported = sections.map(section => ({
      ...section,
      ratingBand: known.find(({ name }) => name === section.name)?.ratingBand ?? '',
    }));
    this.importedSections.set(imported);
    this.emitChange();
    await Promise.all([this.checkPlayers(imported), this.checkImport()]);
  }

  public onSectionEdited(
    index: number,
    field: 'name' | 'ratingBand',
    value: string,
  ): void {
    this.importedSections.update(sections =>
      sections
        ? sections.map((section, at) =>
            at === index ? { ...section, [field]: value } : section,
          )
        : sections,
    );
    // Saving waits until the edit has been checked
    if (this.originalTournament()) {
      this.checking.set(true);
    }
    this.sectionEdits.next();
  }

  // The archived game a new game was confirmed to be, or that it is a new game
  public onGameChosen(key: string, choice: string): void {
    const archivedGameId = choice && choice !== NEW_GAME ? choice : null;
    const decide = (games: GameInput[]): GameInput[] =>
      games.map(game => (gameKey(game) === key ? { ...game, archivedGameId } : game));
    this.chosenNew.update(chosen => {
      const next = new Set(chosen);
      if (choice === NEW_GAME) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
    this.pgnGames.update(decide);
    this.importedGames.update(games => (games ? decide(games) : games));
    this.recheck();
  }

  public onUncountedReasonEdited(key: string, notCountedReason: string): void {
    const edit = (games: GameInput[]): GameInput[] =>
      games.map(game => (gameKey(game) === key ? { ...game, notCountedReason } : game));
    this.pgnGames.update(edit);
    this.importedGames.update(games => (games ? edit(games) : games));
    this.recheck();
  }

  public onMemberChosen(name: string, memberId: string): void {
    this.chosenMembers.update(chosen => new Map(chosen).set(name, memberId));
  }

  // Gives a new name to the member it belongs to, so this import and every later one find
  // the member by it
  public async onNameLinked(name: string): Promise<void> {
    const memberId = this.chosenMembers().get(name);
    if (!memberId) {
      return;
    }
    this.linkingName.set(name);
    this.linkProblem.set(null);
    try {
      const { data: otherNames } = await firstValueFrom(
        this.membersApiService.getOtherNames(memberId),
      );
      await firstValueFrom(
        this.membersApiService.updateOtherNames(memberId, [...otherNames, name]),
      );
      const sections = this.importedSections();
      if (sections) {
        await this.checkPlayers(sections);
      }
    } catch (error) {
      this.linkProblem.set(parseError(error).message);
    } finally {
      this.linkingName.set(null);
    }
  }

  public onClearImport(): void {
    this.clearImport();
    this.emitChange();
  }

  public onRestore(): void {
    const originalTournament = this.originalTournament();
    this.restore.emit(originalTournament?.number ?? null);
    this.clearImport();
    this.form.reset(this.toFormValue(tournamentFormData(originalTournament)));
    this.showRegistrationDefaults();
  }

  public onCancel(): void {
    this.cancel.emit();
  }

  // A click that leaves the page starts by leaving a field, so the draft is saved first
  public onFieldLeft(): void {
    this.emitChange();
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid || this.sectionNameErrors().some(error => error !== null)) {
      this.form.markAllAsTouched();
      return;
    }

    // The draft reaches the store after a pause in typing, and saving reads it from there
    this.saved.next();
    this.emitChange();

    const originalTournament = this.originalTournament();
    const dialog: Dialog = {
      title: 'Confirm',
      body: originalTournament
        ? `Update ${originalTournament.name}?${this.importedGames() ? ' The games from the PGN will be added to the game archive.' : this.importedSections() ? ' The imported results will replace the recorded ones.' : ''}`
        : `Add ${this.form.controls.name.value} to the tournaments?`,
      confirmButtonText: originalTournament ? 'Update' : 'Add',
      confirmAction: () => this.save(),
    };

    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;
  }

  private save(): Promise<unknown> {
    const originalTournament = this.originalTournament();
    return originalTournament
      ? this.storeRequests.dispatch(
          TournamentsActions.updateTournamentRequested({
            tournamentNumber: originalTournament.number,
          }),
          [
            TournamentsActions.updateTournamentSucceeded,
            TournamentsActions.updateTournamentFailed,
          ],
        )
      : this.storeRequests.dispatch(TournamentsActions.addTournamentRequested(), [
          TournamentsActions.addTournamentSucceeded,
          TournamentsActions.addTournamentFailed,
        ]);
  }

  private namesakesOf(files: readonly File[]): File[] {
    const listed = this.standingsFiles();
    const added = files.filter(file => !listed.includes(file));
    return listed.filter(file => added.some(({ name }) => name === file.name));
  }

  private async confirmReplacing(replaced: File[]): Promise<boolean> {
    const names = new Intl.ListFormat('en').format(replaced.map(({ name }) => name));
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Replace ${names} with the ${replaced.length === 1 ? 'file' : 'files'} just chosen?`,
      confirmButtonText: 'Replace',
    };
    const result = await this.dialogService.open<BasicDialogResult>(
      BasicDialogComponent,
      {
        inputs: { dialog },
      },
    ).result;
    return result === 'confirm';
  }

  // Tells which names the archive already knows, so a misspelling shows before it is saved
  private async checkPlayers(sections: SectionInput[]): Promise<void> {
    const attempt = this.importAttempt;
    this.playerCheckFailed.set(false);
    try {
      const response = await firstValueFrom(
        this.tournamentsApiService.matchPlayers(
          sections.flatMap(({ entries }) =>
            entries.filter(({ playerId }) => playerId === null).map(({ name }) => name),
          ),
        ),
      );
      if (attempt === this.importAttempt) {
        this.playerMatches.set(response.data);
        if (response.data.some(({ playerId, memberId }) => !playerId && !memberId)) {
          void this.loadMembers();
        }
      }
    } catch {
      if (attempt === this.importAttempt) {
        this.playerMatches.set([]);
        this.playerCheckFailed.set(true);
      }
    }
  }

  // Saving waits until the change has been checked
  private recheck(): void {
    if (this.originalTournament()) {
      this.checking.set(true);
    }
    this.sectionEdits.next();
  }

  private async loadMembers(): Promise<void> {
    if (this.members().length) {
      return;
    }
    try {
      const { data } = await firstValueFrom(
        this.membersApiService.getAllMembers('admin'),
      );
      this.members.set(data.items);
    } catch (error) {
      this.linkProblem.set(parseError(error).message);
    }
  }

  private clearImport(): void {
    this.importAttempt++;
    this.importing.set(false);
    this.standingsFiles.set([]);
    this.importProblems.set([]);
    this.playerMatches.set([]);
    this.playerCheckFailed.set(false);
    this.importedSections.set(null);
    this.importedGames.set(null);
    this.checkAttempt++;
    this.checking.set(false);
    this.importChanges.set(null);
    this.checkedGames.set([]);
    this.pgnGames.set([]);
    this.pgnPlayerNames.set({});
    this.offeredCandidates.set(new Map());
    this.chosenNew.set(new Set());
    this.linkProblem.set(null);
  }

  // The day saving would give the tournament; a start date still being typed leaves it as
  // recorded, since the form cannot be saved without one
  private savedDate(tournament: Tournament): string {
    const date = this.form.controls.date.value;
    return date ? toDayString(date) : tournament.date;
  }

  /**
   * Asks the server what saving the import would change, which is exactly what the save
   * itself will do: only the sections it names as changed are shown, and only the games it
   * finds new or different are kept to be saved.
   */
  private async checkImport(): Promise<void> {
    const tournament = this.originalTournament();
    const sections = this.importedSections();
    if (!tournament || !sections) {
      this.importChanges.set(null);
      return;
    }

    const games = this.pgnGames().length ? this.pgnGames() : (this.importedGames() ?? []);
    const attempt = ++this.checkAttempt;
    this.checking.set(true);
    try {
      const { data } = await firstValueFrom(
        this.tournamentsApiService.checkImport(
          tournament.number,
          this.savedDate(tournament),
          sections,
          games,
        ),
      );
      if (attempt !== this.checkAttempt) {
        return;
      }
      this.checkedGames.set(games);
      this.importChanges.set(data);
      this.offeredCandidates.update(offered => {
        const next = new Map(offered);
        games.forEach((game, index) => {
          if (data.candidates[index]?.length) {
            next.set(gameKey(game), data.candidates[index]);
          }
        });
        return next;
      });
      if (this.importedGames() !== null) {
        this.importedGames.set(
          games.filter((_, index) => data.games[index] !== 'unchanged'),
        );
        this.emitChange();
      }
      this.checking.set(false);
    } catch {
      if (attempt !== this.checkAttempt) {
        return;
      }
      this.clearImport();
      this.importProblems.set([
        'The import could not be checked against the recorded results, so it was not used.',
      ]);
      this.emitChange();
    }
  }

  // While registration is off its fields show the window it would start with, so turning
  // it on only enables them. Opening straight away and closing as the first day starts
  // suits most tournaments, and a first day already past or not yet set gives a week
  private showRegistrationDefaults(): void {
    const controls = this.form.controls;
    if (controls.hasRegistration.value) {
      return;
    }
    const opensAt = moment.tz(CLUB_TIME_ZONE).startOf('hour');
    const firstDayEvening = fromClubDateTime(controls.date.value, '18:00');
    const closesAt =
      firstDayEvening && moment(firstDayEvening).isAfter(opensAt)
        ? firstDayEvening
        : opensAt.clone().add(1, 'week').toISOString();
    const opens = toClubDateTime(opensAt.toISOString());
    const closes = toClubDateTime(closesAt);
    controls.registrationOpensDay.setValue(opens.day, { emitEvent: false });
    controls.registrationOpensTime.setValue(opens.time, { emitEvent: false });
    controls.registrationClosesDay.setValue(closes.day, { emitEvent: false });
    controls.registrationClosesTime.setValue(closes.time, { emitEvent: false });
  }

  private syncRegistrationControls(hasRegistration: boolean): void {
    const controls = this.form.controls;
    for (const control of [
      controls.registrationOpensDay,
      controls.registrationOpensTime,
      controls.registrationClosesDay,
      controls.registrationClosesTime,
    ]) {
      if (hasRegistration) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  private toFormValue(data: TournamentFormData): TournamentFormValue {
    const opens = data.registrationOpens ? toClubDateTime(data.registrationOpens) : null;
    const closes = data.registrationCloses
      ? toClubDateTime(data.registrationCloses)
      : null;
    return {
      name: data.name,
      subtitle: data.subtitle,
      date: data.date ? fromDayString(data.date) : null,
      endDate: data.endDate ? fromDayString(data.endDate) : null,
      format: data.format,
      timeControl: data.timeControl,
      roundCount: data.roundCount,
      isRated: data.isRated,
      articleId: data.articleId ?? '',
      hasRegistration: !!opens || !!closes,
      registrationOpensDay: opens?.day ?? null,
      registrationOpensTime: opens?.time ?? null,
      registrationClosesDay: closes?.day ?? null,
      registrationClosesTime: closes?.time ?? null,
    };
  }

  private buildForm(data: TournamentFormData): FormGroup<TournamentFormGroup> {
    const value = this.toFormValue(data);
    return new FormGroup<TournamentFormGroup>({
      name: new FormControl(value.name, {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100), textValidator],
      }),
      subtitle: new FormControl(value.subtitle, {
        nonNullable: true,
        validators: [Validators.maxLength(100), textValidator],
      }),
      date: new FormControl<Date | null>(value.date, Validators.required),
      endDate: new FormControl<Date | null>(value.endDate, notBeforeDayValidator('date')),
      format: new FormControl(value.format, {
        nonNullable: true,
        validators: Validators.required,
      }),
      timeControl: new FormControl(value.timeControl, {
        nonNullable: true,
        validators: [Validators.required, timeControlValidator],
      }),
      roundCount: new FormControl<number | null>(value.roundCount, roundCountValidator),
      isRated: new FormControl(value.isRated, { nonNullable: true }),
      articleId: new FormControl(value.articleId, {
        nonNullable: true,
        validators: idValidator,
      }),
      hasRegistration: new FormControl(value.hasRegistration, { nonNullable: true }),
      registrationOpensDay: new FormControl<Date | null>(
        value.registrationOpensDay,
        Validators.required,
      ),
      registrationOpensTime: new FormControl<string | null>(
        value.registrationOpensTime,
        Validators.required,
      ),
      registrationClosesDay: new FormControl<Date | null>(
        value.registrationClosesDay,
        Validators.required,
      ),
      registrationClosesTime: new FormControl<string | null>(
        value.registrationClosesTime,
        [
          Validators.required,
          closesAfterOpensValidator({
            opensDay: 'registrationOpensDay',
            opensTime: 'registrationOpensTime',
            closesDay: 'registrationClosesDay',
          }),
        ],
      ),
    });
  }

  private emitChange(): void {
    const value = this.form.getRawValue();
    const register = value.hasRegistration;
    this.change.emit({
      tournamentNumber: this.originalTournament()?.number ?? null,
      formData: {
        name: value.name,
        subtitle: value.subtitle,
        date: value.date ? toDayString(value.date) : '',
        endDate: value.endDate ? toDayString(value.endDate) : null,
        format: value.format,
        timeControl: value.timeControl,
        roundCount: value.roundCount,
        isRated: value.isRated,
        articleId: value.articleId || null,
        registrationOpens: register
          ? fromClubDateTime(value.registrationOpensDay, value.registrationOpensTime)
          : null,
        registrationCloses: register
          ? fromClubDateTime(value.registrationClosesDay, value.registrationClosesTime)
          : null,
        sections: this.importedSections(),
        games: this.importedGames(),
      },
    });
  }
}
