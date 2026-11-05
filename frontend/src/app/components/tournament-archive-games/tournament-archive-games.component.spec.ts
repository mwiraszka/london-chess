import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of, throwError } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_TOURNAMENTS } from '@app/mocks/tournaments.mock';
import { ArchiveGamesReview, ArchivedGameSummary } from '@app/models';
import { TournamentsApiService } from '@app/services';
import { TournamentsActions } from '@app/store/tournaments';
import { query, queryAll } from '@app/utils';

import { TournamentArchiveGamesComponent } from './tournament-archive-games.component';

describe('TournamentArchiveGamesComponent', () => {
  let fixture: ComponentFixture<TournamentArchiveGamesComponent>;
  let component: TournamentArchiveGamesComponent;
  let tournamentsApi: { getArchiveGames: Mock; updateArchiveGames: Mock };

  const [john, jane] = MOCK_TOURNAMENTS[0].sections[0].entries.map(
    ({ player }) => player,
  );

  const archived: ArchivedGameSummary = {
    id: '6a0000000000000000000001',
    tournament: 'Fall Active',
    section: 'Final',
    round: '1.1',
    date: '2023-10-19',
    result: '1-0',
    white: john,
    black: jane,
  };

  const REVIEW: ArchiveGamesReview = {
    unlinked: [
      { section: '', round: 1, players: [john, jane], candidates: [archived] },
      { section: '', round: 2, players: [jane, john], candidates: [] },
    ],
    unplaced: [
      {
        ...archived,
        id: '6a0000000000000000000002',
        notCounted: false,
        notCountedReason: '',
      },
    ],
  };

  const render = async (): Promise<void> => {
    fixture = TestBed.createComponent(TournamentArchiveGamesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tournamentNumber', 90);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    tournamentsApi = {
      getArchiveGames: vi.fn().mockReturnValue(of({ data: REVIEW })),
      updateArchiveGames: vi
        .fn()
        .mockReturnValue(of({ data: { unlinked: [], unplaced: [] } })),
    };

    await TestBed.configureTestingModule({
      imports: [TournamentArchiveGamesComponent],
      providers: [
        provideMockStore(),
        { provide: TournamentsApiService, useValue: tournamentsApi },
      ],
    }).compileComponents();
  });

  it('should offer the archived games each untied round might be, and count the rest', async () => {
    await render();

    const [choice] = queryAll(fixture.debugElement, 'ea-dropdown');
    expect(queryAll(fixture.debugElement, 'ea-dropdown')).toHaveLength(1);
    expect(choice.componentInstance.label()).toBe('round 1: John Doe v Jane Smith');
    expect(choice.componentInstance.options()).toEqual([
      {
        value: archived.id,
        label: 'Fall Active (Final), round 1.1, Oct 19, 2023: John Doe v Jane Smith, 1-0',
      },
    ]);
    expect(fixture.nativeElement.textContent).toContain(
      'One round the results record has no game in the archive between its players.',
    );
  });

  it('should save the games tied to rounds and those left uncounted, then refresh the tournament', async () => {
    await render();
    const dispatchSpy = vi.spyOn(TestBed.inject(MockStore), 'dispatch');

    query(fixture.debugElement, 'ea-dropdown').triggerEventHandler(
      'changed',
      archived.id,
    );
    query(fixture.debugElement, 'ea-checkbox').triggerEventHandler('changed', true);
    fixture.detectChanges();
    query(fixture.debugElement, '.archive-games__reason').triggerEventHandler(
      'valueChange',
      'Withdrew',
    );
    await component.onSave();
    fixture.detectChanges();

    expect(tournamentsApi.updateArchiveGames).toHaveBeenCalledWith(90, {
      links: [
        { gameId: archived.id, section: '', round: 1, playerIds: [john.id, jane.id] },
      ],
      counts: [
        {
          gameId: '6a0000000000000000000002',
          notCounted: true,
          notCountedReason: 'Withdrew',
        },
      ],
    });
    expect(dispatchSpy).toHaveBeenCalledWith(
      TournamentsActions.fetchTournamentRequested({ tournamentNumber: 90 }),
    );
    expect(fixture.nativeElement.textContent).toContain('The games were saved.');
  });

  it('should offer to load the games again when they fail to load', async () => {
    tournamentsApi.getArchiveGames.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );
    await render();

    query(fixture.debugElement, 'lcc-load-failed').triggerEventHandler('retry');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(tournamentsApi.getArchiveGames).toHaveBeenCalledTimes(2);
    expect(query(fixture.debugElement, 'ea-dropdown')).toBeTruthy();
  });
});
