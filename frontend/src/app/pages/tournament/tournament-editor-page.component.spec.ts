import { DialogService } from '@eagami/ui';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject, EMPTY, firstValueFrom } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TournamentFormComponent } from '@app/components/tournament-form/tournament-form.component';
import { INITIAL_TOURNAMENT_FORM_DATA } from '@app/constants/tournaments';
import { MOCK_UPCOMING_TOURNAMENT } from '@app/mocks/tournaments.mock';
import {
  MetaAndTitleService,
  StandingsFileService,
  StoreRequestService,
  TournamentsApiService,
} from '@app/services';
import { initialState as membersInitialState } from '@app/store/members/members.reducer';
import {
  TournamentsActions,
  TournamentsState,
  initialState,
} from '@app/store/tournaments';
import { tournamentsAdapter } from '@app/store/tournaments/tournaments.reducer';
import { closedDialogRef, query, queryTextContent, tournamentFormData } from '@app/utils';

import { TournamentEditorPageComponent } from './tournament-editor-page.component';

describe('TournamentEditorPageComponent', () => {
  let fixture: ComponentFixture<TournamentEditorPageComponent>;
  let component: TournamentEditorPageComponent;
  let store: MockStore;
  let dispatchSpy: MockInstance;
  let params: BehaviorSubject<{ number?: string }>;

  const number = MOCK_UPCOMING_TOURNAMENT.number;

  const stateWith = (tournamentsState: TournamentsState) => ({
    membersState: membersInitialState,
    tournamentsState,
  });

  const loaded: TournamentsState = tournamentsAdapter.setAll(
    [MOCK_UPCOMING_TOURNAMENT],
    initialState,
  );

  beforeEach(async () => {
    params = new BehaviorSubject<{ number?: string }>({});

    await TestBed.configureTestingModule({
      imports: [TournamentEditorPageComponent],
      providers: [
        provideMockActions(() => EMPTY),
        provideMockStore({ initialState: stateWith(loaded) }),
        { provide: ActivatedRoute, useValue: { params: params.asObservable() } },
        {
          provide: MetaAndTitleService,
          useValue: { updateTitle: vi.fn(), updateDescription: vi.fn() },
        },
        { provide: DialogService, useValue: { open: vi.fn(() => closedDialogRef()) } },
        { provide: StandingsFileService, useValue: { importStandings: vi.fn() } },
        { provide: StoreRequestService, useValue: { dispatch: vi.fn() } },
        { provide: TournamentsApiService, useValue: { matchPlayers: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentEditorPageComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');
  });

  const form = (): TournamentFormComponent =>
    query(fixture.debugElement, 'lcc-tournament-form').componentInstance;

  it('should offer a blank form for a new tournament', () => {
    fixture.detectChanges();

    expect(queryTextContent(fixture.debugElement, '.page-heading')).toBe(
      'Add a tournament',
    );
    expect(form().formData()).toBe(INITIAL_TOURNAMENT_FORM_DATA);
    expect(form().originalTournament()).toBeNull();
    expect(TestBed.inject(MetaAndTitleService).updateTitle).toHaveBeenCalledWith(
      'Add a tournament',
    );
  });

  it('should edit a recorded tournament from its details', () => {
    params.next({ number: String(number) });
    fixture.detectChanges();

    expect(queryTextContent(fixture.debugElement, '.page-heading')).toBe(
      'Edit Fall Rapid',
    );
    expect(form().formData()).toEqual(tournamentFormData(MOCK_UPCOMING_TOURNAMENT));
    expect(form().originalTournament()).toBe(MOCK_UPCOMING_TOURNAMENT);
  });

  it('should report unsaved changes to the guard', async () => {
    store.setState(
      stateWith({
        ...loaded,
        newTournamentFormData: { ...INITIAL_TOURNAMENT_FORM_DATA, name: 'Draft' },
      }),
    );
    fixture.detectChanges();

    const viewModel = await firstValueFrom(component.viewModel$!);

    expect(viewModel.hasUnsavedChanges).toBe(true);
    expect(component.entity).toBe('tournament');
  });

  it('should hold a skeleton until the tournament arrives, and offer a retry if it fails', () => {
    store.setState(stateWith(initialState));
    params.next({ number: '200' });
    fixture.detectChanges();
    const skeleton = query(fixture.debugElement, 'lcc-form-skeleton');

    store.setState(stateWith({ ...initialState, failedLoads: ['tournament'] }));
    fixture.detectChanges();
    query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');

    expect(skeleton).toBeTruthy();
    expect(dispatchSpy).toHaveBeenCalledWith(
      TournamentsActions.fetchTournamentRequested({ tournamentNumber: 200 }),
    );
  });

  it("should pass the form's changes, restores and cancels on to the store", () => {
    params.next({ number: String(number) });
    fixture.detectChanges();
    dispatchSpy.mockClear();

    component.onChange(number, { name: 'Fall Rapid Open' });
    component.onRestore(number);
    component.onCancel(number);

    expect(dispatchSpy.mock.calls.map(([action]) => action)).toEqual([
      TournamentsActions.formDataChanged({
        tournamentNumber: number,
        formData: { name: 'Fall Rapid Open' },
      }),
      TournamentsActions.formDataRestored({ tournamentNumber: number }),
      TournamentsActions.cancelSelected({ tournamentNumber: number }),
    ]);
  });
});
