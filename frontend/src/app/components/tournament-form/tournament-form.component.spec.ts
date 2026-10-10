import { ButtonComponent, DialogService } from '@eagami/ui';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject, of, throwError } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FORM_CHANGE_DEBOUNCE, FORM_ERROR_MESSAGES } from '@app/constants/forms';
import { INITIAL_TOURNAMENT_FORM_DATA } from '@app/constants/tournaments';
import { MOCK_TOURNAMENTS, MOCK_UPCOMING_TOURNAMENT } from '@app/mocks/tournaments.mock';
import {
  GameChange,
  GameInput,
  ImportChanges,
  SectionInput,
  StandingsImport,
  Tournament,
  TournamentFormData,
} from '@app/models';
import {
  StandingsFileService,
  StoreRequestService,
  TournamentsApiService,
} from '@app/services';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import { TournamentsActions } from '@app/store/tournaments';
import {
  closedDialogRef,
  lastOpenedDialog,
  query,
  queryAll,
  toDayString,
  tournamentFormData,
} from '@app/utils';

import { TournamentFormComponent } from './tournament-form.component';

describe('TournamentFormComponent', () => {
  let fixture: ComponentFixture<TournamentFormComponent>;
  let component: TournamentFormComponent;

  let changeSpy: MockInstance;
  let restoreSpy: MockInstance;
  let cancelSpy: MockInstance;
  let dialogOpenSpy: Mock;
  let importStandingsSpy: Mock;
  let matchPlayersSpy: Mock;
  let storeRequestSpy: Mock;

  const imported = (
    sections: SectionInput[],
    problems: string[] = [],
  ): StandingsImport => ({ sections, games: [], problems });

  const section = (overrides: Partial<SectionInput> = {}): SectionInput => ({
    name: 'A',
    ratingBand: '',
    roundCount: 1,
    isDoubleRound: false,
    entries: [
      {
        rank: 1,
        name: 'Doe, Jane',
        playerId: null,
        rating: 1600,
        provisionalGames: null,
        score: 1,
        tiebreak: null,
        rounds: [
          {
            round: 1,
            outcome: 'game',
            scores: [1],
            points: 1,
            opponentRank: 2,
            color: 'white',
          },
        ],
      },
      {
        rank: 2,
        name: 'Roe, Rick',
        playerId: null,
        rating: null,
        provisionalGames: null,
        score: 0,
        tiebreak: null,
        rounds: [
          {
            round: 1,
            outcome: 'game',
            scores: [0],
            points: 0,
            opponentRank: 1,
            color: 'black',
          },
        ],
      },
    ],
    ...overrides,
  });

  const upcoming = tournamentFormData(MOCK_UPCOMING_TOURNAMENT);

  function render(
    formData: TournamentFormData = upcoming,
    hasUnsavedChanges = false,
    originalTournament: Tournament | null = MOCK_UPCOMING_TOURNAMENT,
  ): void {
    fixture = TestBed.createComponent(TournamentFormComponent);
    component = fixture.componentInstance;
    changeSpy = vi.spyOn(component.change, 'emit');
    restoreSpy = vi.spyOn(component.restore, 'emit');
    cancelSpy = vi.spyOn(component.cancel, 'emit');

    fixture.componentRef.setInput('formData', formData);
    fixture.componentRef.setInput('hasUnsavedChanges', hasUnsavedChanges);
    fixture.componentRef.setInput('originalTournament', originalTournament);
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const lastDraft = (): Partial<TournamentFormData> =>
    changeSpy.mock.lastCall?.[0].formData;

  const errorTexts = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role="alert"]')).map(
      element => element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );

  const button = (selector: string): ButtonComponent =>
    query(fixture.debugElement, selector).componentInstance;

  const importFile = async (): Promise<void> => {
    await component.onStandingsChosen([new File(['xlsx'], 'Standings.xlsx')]);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentFormComponent],
      providers: [
        provideMockStore({ initialState: { membersState: membersInitialState } }),
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        { provide: StandingsFileService, useValue: { importStandings: vi.fn() } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
        {
          provide: TournamentsApiService,
          useValue: {
            matchPlayers: vi.fn().mockReturnValue(of({ data: [] })),
            // Every imported section changes, as the server would find of new results
            checkImport: vi.fn(
              (_number: number, sections: SectionInput[], games: GameInput[]) =>
                of({
                  data: {
                    sectionChanges: sections.map(() => true),
                    removedSections: [],
                    games: games.map((): GameChange => 'new'),
                  },
                }),
            ),
          },
        },
      ],
    }).compileComponents();

    dialogOpenSpy = vi.mocked(TestBed.inject(DialogService).open);
    importStandingsSpy = vi.mocked(TestBed.inject(StandingsFileService).importStandings);
    matchPlayersSpy = vi.mocked(TestBed.inject(TournamentsApiService).matchPlayers);
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
  });

  describe('initialization', () => {
    it('should fill every field from the form data', () => {
      render();

      const value = component.form.getRawValue();
      expect(value.name).toBe('Fall Rapid');
      expect(toDayString(value.date!)).toBe('2050-10-15');
      expect(toDayString(value.endDate!)).toBe('2050-10-29');
      expect(value.format).toBe('swiss');
      expect(value.isRated).toBe(true);
      expect(value.articleId).toBe('');
      expect(value.hasRegistration).toBe(true);
      expect(toDayString(value.registrationOpensDay!)).toBe('2026-01-01');
      expect(value.registrationOpensTime).toBe('07:00');
      expect(value.registrationClosesTime).toBe('17:00');
    });

    it('should switch registration off and set its fields aside without a window', () => {
      render({ ...upcoming, registrationOpens: null, registrationCloses: null });

      expect(component.form.controls.hasRegistration.value).toBe(false);
      expect(component.form.controls.registrationOpensDay.disabled).toBe(true);
      expect(component.form.controls.registrationClosesTime.disabled).toBe(true);
      expect(component.form.valid).toBe(true);
    });

    it('should start a new tournament without any errors showing', async () => {
      render(INITIAL_TOURNAMENT_FORM_DATA, false, null);

      await settle();

      expect(component.form.invalid).toBe(true);
      expect(errorTexts()).toEqual([]);
    });

    it('should show the errors of a restored draft straight away', async () => {
      render({ ...upcoming, name: '' }, true);

      await settle();

      expect(component.form.controls.name.touched).toBe(true);
      expect(errorTexts()).toHaveLength(1);
    });

    it('should pass the draft to the store as soon as the form opens', () => {
      render();

      expect(changeSpy).toHaveBeenCalledWith({
        tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
        formData: upcoming,
      });
    });

    it('should check the names of results restored from a draft', () => {
      render({ ...upcoming, sections: [section()] }, true);

      expect(matchPlayersSpy).toHaveBeenCalledWith(['Doe, Jane', 'Roe, Rick']);
    });
  });

  describe('keeping the draft', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-27T14:25:00.000Z'));
    });

    afterEach(() => vi.useRealTimers());

    it('should pass changes on once typing pauses, blanks as null', () => {
      render();
      changeSpy.mockClear();

      component.form.patchValue({
        name: 'Fall Rapid Open',
        articleId: '',
        endDate: null,
        roundCount: 7,
      });
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(lastDraft()).toEqual(
        expect.objectContaining({
          name: 'Fall Rapid Open',
          articleId: null,
          endDate: null,
          roundCount: 7,
        }),
      );
    });

    it('should pass the draft on at once when focus leaves a field', () => {
      render();
      component.form.controls.name.setValue('Fall Rapid Open');

      query(fixture.debugElement, 'form').triggerEventHandler('focusout');

      expect(lastDraft()).toEqual(expect.objectContaining({ name: 'Fall Rapid Open' }));
    });

    it('should drop the registration window once registration is switched off', () => {
      render();

      component.form.controls.hasRegistration.setValue(false);
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

      expect(lastDraft()).toEqual(
        expect.objectContaining({ registrationOpens: null, registrationCloses: null }),
      );
    });

    it('should open registration now and close it as the first day starts', () => {
      render({ ...upcoming, registrationOpens: null, registrationCloses: null });

      component.form.controls.hasRegistration.setValue(true);
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);

      expect(lastDraft()).toEqual(
        expect.objectContaining({
          registrationOpens: '2026-09-27T14:00:00.000Z',
          registrationCloses: '2050-10-15T22:00:00.000Z',
        }),
      );
      expect(component.form.valid).toBe(true);
    });
  });

  describe('validation', () => {
    beforeEach(() => render());

    it('should require a name and a start date', () => {
      component.form.patchValue({ name: '', date: null });

      expect(component.form.controls.name.hasError('required')).toBe(true);
      expect(component.form.controls.date.hasError('required')).toBe(true);
    });

    it('should refuse an end date before the start, and recheck it when the start moves', () => {
      component.form.controls.endDate.setValue(new Date(2050, 9, 1));
      const before = component.form.controls.endDate.hasError('endBeforeStart');

      component.form.controls.date.setValue(new Date(2050, 8, 1));

      expect(before).toBe(true);
      expect(component.form.controls.endDate.valid).toBe(true);
    });

    it('should refuse registration closing before it opens', async () => {
      component.form.patchValue({ registrationClosesDay: new Date(2025, 0, 1) });
      component.form.controls.registrationClosesTime.markAsTouched();

      await settle();

      expect(
        component.form.controls.registrationClosesTime.hasError('closesBeforeOpens'),
      ).toBe(true);
      expect(errorTexts()).toEqual([FORM_ERROR_MESSAGES['closesBeforeOpens']]);
    });

    it('should accept only an article ID for the article', () => {
      component.form.controls.articleId.setValue(
        'https://londonchess.ca/article/view/679ee6041a2b3c4d5e6f7a8b',
      );
      const link = component.form.controls.articleId.hasError('invalidId');

      component.form.controls.articleId.setValue('679ee6041a2b3c4d5e6f7a8b');

      expect(link).toBe(true);
      expect(component.form.controls.articleId.valid).toBe(true);
    });

    it('should accept only a time control written the way past ones were', () => {
      component.form.controls.timeControl.setValue('25 minutes');
      const unknown = component.form.controls.timeControl.hasError('invalidTimeControl');

      component.form.controls.timeControl.setValue('G25+5');

      expect(unknown).toBe(true);
      expect(component.form.controls.timeControl.valid).toBe(true);
    });

    it('should take an optional whole number of rounds', () => {
      component.form.controls.roundCount.setValue(31);
      const tooMany = component.form.controls.roundCount.hasError('invalidRoundCount');

      component.form.controls.roundCount.setValue(null);

      expect(tooMany).toBe(true);
      expect(component.form.controls.roundCount.valid).toBe(true);
    });
  });

  describe('importing results', () => {
    it('should preview the imported sections and put them in the draft', async () => {
      render(tournamentFormData(MOCK_TOURNAMENTS[2]), false, MOCK_TOURNAMENTS[2]);
      importStandingsSpy.mockResolvedValue(imported([section()]));

      await importFile();

      expect(lastDraft()?.sections).toEqual([section()]);
      expect(queryAll(fixture.debugElement, '.results__section')).toHaveLength(1);
      expect(
        fixture.nativeElement.querySelector('.results__table').textContent,
      ).toContain('Doe, Jane');
    });

    it('should keep the rating band of a section it replaces', async () => {
      const recorded = MOCK_TOURNAMENTS[0];
      render(tournamentFormData(recorded), false, {
        ...recorded,
        sections: [{ ...recorded.sections[0], name: 'A', ratingBand: 'Open' }],
      });
      importStandingsSpy.mockResolvedValue(imported([section()]));

      await importFile();

      expect(lastDraft()?.sections?.[0].ratingBand).toBe('Open');
    });

    it('should mark players the archive does not know yet', async () => {
      render();
      importStandingsSpy.mockResolvedValue(imported([section()]));
      matchPlayersSpy.mockReturnValue(
        of({
          data: [
            {
              name: 'Doe, Jane',
              playerId: '64b7f0c2a1d3e4f5a6b7c8a3',
              memberNumber: null,
            },
            { name: 'Roe, Rick', playerId: null, memberNumber: null },
          ],
        }),
      );

      await importFile();

      const rows = queryAll(fixture.debugElement, '.results__table tbody tr');
      expect(rows[1].nativeElement.textContent).toContain('New');
      expect(rows[0].nativeElement.textContent).not.toContain('New');
      expect(fixture.nativeElement.textContent).toContain(
        'One player is not in the archive yet',
      );
    });

    it('should say when the names could not be checked', async () => {
      render();
      importStandingsSpy.mockResolvedValue(imported([section()]));
      matchPlayersSpy.mockReturnValue(throwError(() => new Error('offline')));

      await importFile();

      expect(fixture.nativeElement.textContent).toContain(
        'The names could not be checked against the archive',
      );
    });

    it('should list what stopped an import and keep the results as they were', async () => {
      render();
      const problems = Array.from({ length: 12 }, (_, index) => `Problem ${index + 1}.`);
      importStandingsSpy.mockResolvedValue(imported([], problems));

      await importFile();

      const alert = fixture.nativeElement.querySelector('.results__problems');
      expect(alert.querySelectorAll('li')).toHaveLength(10);
      expect(alert.textContent).toContain('2 more problems were found.');
      expect(component.form.valid).toBe(true);
      expect(lastDraft()?.sections).toBeNull();
    });

    it('should ignore an import overtaken by a later one', async () => {
      render();
      let finishFirst!: (result: StandingsImport) => void;
      importStandingsSpy
        .mockReturnValueOnce(
          new Promise<StandingsImport>(resolve => (finishFirst = resolve)),
        )
        .mockResolvedValueOnce(imported([section({ name: 'B' })]));

      const first = component.onStandingsChosen([new File(['1'], 'First.xlsx')]);
      await component.onStandingsChosen([new File(['2'], 'Second.xlsx')]);
      finishFirst(imported([section({ name: 'A' })]));
      await first;

      expect(lastDraft()?.sections?.map(({ name }) => name)).toEqual(['B']);
    });

    it('should rename sections and refuse two with one name', async () => {
      vi.useFakeTimers();
      render();
      importStandingsSpy.mockResolvedValue(
        imported([section({ name: 'A' }), section({ name: 'B' })]),
      );
      await importFile();

      component.onSectionEdited(1, 'ratingBand', 'U1500');
      vi.advanceTimersByTime(FORM_CHANGE_DEBOUNCE);
      const band = lastDraft()?.sections?.[1].ratingBand;
      component.onSectionEdited(1, 'name', 'A');
      await vi.advanceTimersByTimeAsync(FORM_CHANGE_DEBOUNCE);
      fixture.detectChanges();
      await component.onSubmit();

      expect(band).toBe('U1500');
      expect(
        queryAll(fixture.debugElement, '.results__section [role="alert"]').map(alert =>
          alert.nativeElement.textContent.trim(),
        ),
      ).toEqual([
        'Another section already has this name',
        'Another section already has this name',
      ]);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should drop the imported results on request, or when the files are removed', async () => {
      render();
      importStandingsSpy.mockResolvedValue(imported([section()]));
      await importFile();

      component.onClearImport();
      const afterClear = lastDraft()?.sections;
      await importFile();
      await component.onStandingsChosen([]);

      expect(afterClear).toBeNull();
      expect(lastDraft()?.sections).toBeNull();
    });

    it('should hold the save button while the files are read', () => {
      render(upcoming, true);
      importStandingsSpy.mockReturnValue(new Promise<StandingsImport>(() => undefined));

      void component.onStandingsChosen([new File(['x'], 'Standings.xlsx')]);
      fixture.detectChanges();

      expect(button('.submit-button').disabled()).toBe(true);
    });
  });

  describe('restoring', () => {
    it('should put the original tournament back and drop any import', () => {
      render({ ...upcoming, name: 'Changed', sections: [section()] }, true);

      query(fixture.debugElement, 'lcc-form-actions').triggerEventHandler('restore');

      fixture.detectChanges();

      expect(restoreSpy).toHaveBeenCalledWith(MOCK_UPCOMING_TOURNAMENT.number);
      expect(component.form.controls.name.value).toBe('Fall Rapid');
      expect(queryAll(fixture.debugElement, '.results__section')).toHaveLength(0);
      expect(component.form.touched).toBe(false);
    });
  });

  describe('submitting', () => {
    it('should show every error instead of asking to save an invalid form', async () => {
      render({ ...upcoming, name: '' }, true);

      await component.onSubmit();
      await settle();

      expect(errorTexts()).toHaveLength(1);
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should add a new tournament from the confirmation dialog', async () => {
      render(
        { ...INITIAL_TOURNAMENT_FORM_DATA, name: 'Winter Blitz', date: '2050-12-03' },
        true,
        null,
      );

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(lastOpenedDialog(dialogOpenSpy).body).toBe(
        'Add Winter Blitz to the tournaments?',
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        TournamentsActions.addTournamentRequested(),
        [
          TournamentsActions.addTournamentSucceeded,
          TournamentsActions.addTournamentFailed,
        ],
      );
    });

    it('should update a tournament, warning when imported results replace the recorded ones', async () => {
      render({ ...upcoming, sections: [section()] }, true);

      await component.onSubmit();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(lastOpenedDialog(dialogOpenSpy).body).toBe(
        'Update Fall Rapid? The imported results will replace the recorded ones.',
      );
      expect(storeRequestSpy).toHaveBeenCalledWith(
        TournamentsActions.updateTournamentRequested({
          tournamentNumber: MOCK_UPCOMING_TOURNAMENT.number,
        }),
        [
          TournamentsActions.updateTournamentSucceeded,
          TournamentsActions.updateTournamentFailed,
        ],
      );
    });
  });

  describe('template', () => {
    it('should describe the results already recorded', () => {
      render(tournamentFormData(MOCK_TOURNAMENTS[0]), false, MOCK_TOURNAMENTS[0]);

      expect(
        fixture.nativeElement.querySelector('.results__status').textContent,
      ).toContain('Results recorded: 1 section, 3 players.');
    });

    it('should only offer to discard or save once something has changed', () => {
      render(upcoming, false);
      const restoreWithout = button('.restore-button').disabled();
      const submitWithout = button('.submit-button').disabled();
      fixture.destroy();

      render(upcoming, true);

      expect(restoreWithout).toBe(true);
      expect(submitWithout).toBe(true);
      expect(button('.restore-button').disabled()).toBe(false);
      expect(button('.submit-button').disabled()).toBe(false);
    });

    it('should cancel from the cancel button', () => {
      render();

      query(fixture.debugElement, '.cancel-button').triggerEventHandler('clicked');

      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('checking an import against the recorded results', () => {
    const recorded = MOCK_TOURNAMENTS[0];
    const [john, jane, joe] = recorded.sections[0].entries.map(({ player }) => player.id);
    const checkImportSpy = (): Mock =>
      vi.mocked(TestBed.inject(TournamentsApiService).checkImport);

    const pgnGame = (white: string, black: string, round: string): GameInput => ({
      section: '',
      round,
      date: '2023-10-19',
      whitePlayerId: white,
      blackPlayerId: black,
      result: '1-0',
      whiteElo: null,
      blackElo: null,
      eco: '',
      plyCount: 2,
      moves: '1. e4 e5 1-0',
    });
    const games = [
      pgnGame(john, jane, '1'),
      pgnGame(jane, joe, '2'),
      pgnGame(joe, john, '3'),
    ];

    async function importPgn(
      changes: GameChange[],
      sectionChanged = true,
    ): Promise<void> {
      checkImportSpy().mockReturnValue(
        of({
          data: { sectionChanges: [sectionChanged], removedSections: [], games: changes },
        }),
      );
      importStandingsSpy.mockResolvedValue({
        sections: [section()],
        games,
        problems: [],
      });
      render(tournamentFormData(recorded), false, recorded);

      await component.onStandingsChosen([new File(['pgn'], 'Round 3.pgn')]);
      await settle();
    }

    const statusTexts = (): string[] =>
      queryAll(fixture.debugElement, '.results__status').map(({ nativeElement }) =>
        nativeElement.textContent.replace(/\s+/g, ' ').trim(),
      );

    it('should ask the server what the imported sections and games would change', async () => {
      await importPgn(['new', 'new', 'new']);

      expect(checkImportSpy()).toHaveBeenCalledWith(recorded.number, [section()], games);
    });

    it('should keep for saving only the games the server finds new or different', async () => {
      await importPgn(['new', 'unchanged', 'changed']);

      expect(lastDraft().games).toEqual([games[0], games[2]]);
      expect(statusTexts()).toEqual(
        expect.arrayContaining([
          '1 new game will be added to the game archive.',
          'Saving will update this game in the archive: round 3, Bloggs, Joe v Doe, John.',
          'Already in the archive and left unchanged: 1 game from the file.',
        ]),
      );
    });

    it('should say so when nothing in the file differs from what is recorded', async () => {
      await importPgn(['unchanged', 'unchanged', 'unchanged'], false);

      expect(statusTexts()).toContain(
        'Nothing in the file differs from what is already recorded.',
      );
      expect(lastDraft().games).toEqual([]);
    });

    it('should hold the save until the server has answered', async () => {
      const answer = new Subject<{ data: ImportChanges }>();
      checkImportSpy().mockReturnValue(answer);
      importStandingsSpy.mockResolvedValue({
        sections: [section()],
        games,
        problems: [],
      });
      render(tournamentFormData(recorded), true, recorded);

      const choosing = component.onStandingsChosen([new File(['pgn'], 'Round 3.pgn')]);
      await importStandingsSpy.mock.results[0].value;
      fixture.detectChanges();

      expect(button('.submit-button').disabled()).toBe(true);
      answer.next({ data: { sectionChanges: [true], removedSections: [], games: [] } });
      answer.complete();
      await choosing;
    });

    it('should drop an import the server could not check', async () => {
      checkImportSpy().mockReturnValue(throwError(() => new Error('offline')));
      importStandingsSpy.mockResolvedValue({
        sections: [section()],
        games,
        problems: [],
      });
      render(tournamentFormData(recorded), false, recorded);

      await component.onStandingsChosen([new File(['pgn'], 'Round 3.pgn')]);
      await settle();

      expect(lastDraft()).toEqual(
        expect.objectContaining({ sections: null, games: null }),
      );
      expect(errorTexts()).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'The import could not be checked against the recorded results, so it was not used.',
          ),
        ]),
      );
    });

    it('should not check the results of a tournament that is not saved yet', async () => {
      importStandingsSpy.mockResolvedValue(imported([section()]));
      render(INITIAL_TOURNAMENT_FORM_DATA, false, null);

      await importFile();
      await settle();

      expect(checkImportSpy()).not.toHaveBeenCalled();
    });
  });
});
