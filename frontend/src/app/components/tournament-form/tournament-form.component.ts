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
  HistoryIconComponent,
  InputComponent,
  SwitchComponent,
  TimePickerComponent,
} from '@eagami/ui';
import moment from 'moment-timezone';
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
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { CLUB_TIME_ZONE } from '@app/constants/clubs';
import {
  FORM_CHANGE_DEBOUNCE,
  FORM_ERROR_MESSAGES,
  WEEK_STARTS_ON,
} from '@app/constants/forms';
import {
  MAX_LISTED_IMPORT_PROBLEMS,
  TOURNAMENT_FORMAT_OPTIONS,
} from '@app/constants/tournaments';
import {
  BasicDialogResult,
  Dialog,
  ImportPreview,
  ImportPreviewRow,
  PlayerNameMatch,
  SectionInput,
  Tournament,
  TournamentFormData,
  TournamentFormGroup,
  TournamentFormValue,
} from '@app/models';
import {
  StandingsFileService,
  StoreRequestService,
  TournamentsApiService,
} from '@app/services';
import { TournamentsActions } from '@app/store/tournaments';
import {
  formatScore,
  fromClubDateTime,
  fromDayString,
  roundResultLabel,
  toClubDateTime,
  toDayString,
  tournamentFormData,
} from '@app/utils';
import {
  closesAfterOpensValidator,
  idValidator,
  notBeforeDayValidator,
  textValidator,
  timeControlValidator,
} from '@app/validators';

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
    InputComponent,
    ModificationInfoComponent,
    ReactiveFormsModule,
    SwitchComponent,
    TimePickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogService = inject(DialogService);
  private readonly standingsFileService = inject(StandingsFileService);
  private readonly storeRequests = inject(StoreRequestService);
  private readonly tournamentsApiService = inject(TournamentsApiService);

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
  protected readonly restoreIcon = HistoryIconComponent;
  protected readonly weekStartsOn = WEEK_STARTS_ON;

  // Results read from a file but not yet saved; null keeps the recorded ones
  protected readonly importedSections = signal<SectionInput[] | null>(null);
  protected readonly importProblems = signal<string[]>([]);
  protected readonly importing = signal(false);
  protected readonly standingsFiles = signal<readonly File[]>([]);
  protected readonly playerMatches = signal<PlayerNameMatch[]>([]);
  protected readonly playerCheckFailed = signal(false);

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
    return (this.importedSections() ?? []).map((section, index) => ({
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
    }));
  });

  public form!: FormGroup<TournamentFormGroup>;

  private readonly sectionEdits = new Subject<void>();
  private importAttempt = 0;

  public ngOnInit(): void {
    this.form = this.buildForm(this.formData());
    this.importedSections.set(this.formData().sections);
    this.syncRegistrationControls(this.form.controls.hasRegistration.value);
    this.form.controls.endDate.updateValueAndValidity();
    this.form.controls.registrationClosesTime.updateValueAndValidity();

    this.form.controls.hasRegistration.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(hasRegistration => this.onRegistrationToggled(hasRegistration));
    this.form.controls.date.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.form.controls.endDate.updateValueAndValidity());
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
      .pipe(debounceTime(FORM_CHANGE_DEBOUNCE), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitChange());
    this.emitChange();

    if (this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
    }
    const sections = this.importedSections();
    if (sections) {
      void this.checkPlayers(sections);
    }
  }

  public async onStandingsChosen(files: readonly File[]): Promise<void> {
    if (!files.length) {
      this.onClearImport();
      return;
    }
    this.standingsFiles.set(files);
    const attempt = ++this.importAttempt;

    this.importing.set(true);
    const { sections, problems } = await this.standingsFileService.importStandings(files);
    // A later choice of files replaces this one
    if (attempt !== this.importAttempt) {
      return;
    }
    this.importing.set(false);
    this.importProblems.set(problems);
    if (problems.length) {
      return;
    }

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
    await this.checkPlayers(imported);
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
    this.sectionEdits.next();
  }

  public onClearImport(): void {
    this.clearImport();
    this.emitChange();
  }

  public async onRestore(): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: 'Revert to the original tournament data? All changes will be lost.',
      confirmButtonText: 'Revert',
      confirmButtonType: 'warning',
    };

    const dialogResult = await this.dialogService.open<BasicDialogResult>(
      BasicDialogComponent,
      { inputs: { dialog } },
    ).result;

    if (dialogResult !== 'confirm') {
      return;
    }

    const originalTournament = this.originalTournament();
    this.restore.emit(originalTournament?.number ?? null);
    this.clearImport();
    this.form.reset(this.toFormValue(tournamentFormData(originalTournament)));
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
    this.emitChange();

    const originalTournament = this.originalTournament();
    const dialog: Dialog = {
      title: 'Confirm',
      body: originalTournament
        ? `Update ${originalTournament.name}?${this.importedSections() ? ' The imported results will replace the recorded ones.' : ''}`
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

  // Tells which names the archive already knows, so a misspelling shows before it is saved
  private async checkPlayers(sections: SectionInput[]): Promise<void> {
    const attempt = this.importAttempt;
    this.playerCheckFailed.set(false);
    try {
      const response = await firstValueFrom(
        this.tournamentsApiService.matchPlayers(
          sections.flatMap(({ entries }) => entries.map(({ name }) => name)),
        ),
      );
      if (attempt === this.importAttempt) {
        this.playerMatches.set(response.data);
      }
    } catch {
      if (attempt === this.importAttempt) {
        this.playerMatches.set([]);
        this.playerCheckFailed.set(true);
      }
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
  }

  private onRegistrationToggled(hasRegistration: boolean): void {
    const controls = this.form.controls;
    if (hasRegistration && !controls.registrationOpensDay.value) {
      // Opening straight away and closing as the first day starts suits most tournaments
      const opens = toClubDateTime(
        moment.tz(CLUB_TIME_ZONE).startOf('hour').toISOString(),
      );
      const firstDay = controls.date.value;
      controls.registrationOpensDay.setValue(opens.day);
      controls.registrationOpensTime.setValue(opens.time);
      controls.registrationClosesDay.setValue(firstDay ?? opens.day);
      controls.registrationClosesTime.setValue(firstDay ? '18:00' : '23:55');
    }
    this.syncRegistrationControls(hasRegistration);
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
        validators: timeControlValidator,
      }),
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
        isRated: value.isRated,
        articleId: value.articleId || null,
        registrationOpens: register
          ? fromClubDateTime(value.registrationOpensDay, value.registrationOpensTime)
          : null,
        registrationCloses: register
          ? fromClubDateTime(value.registrationClosesDay, value.registrationClosesTime)
          : null,
        sections: this.importedSections(),
      },
    });
  }
}
