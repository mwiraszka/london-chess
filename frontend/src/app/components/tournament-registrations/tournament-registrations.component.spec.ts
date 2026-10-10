import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';

import { MOCK_UPCOMING_SUMMARY } from '@app/mocks/tournaments.mock';
import { TournamentSummary } from '@app/models';
import { query, queryAll } from '@app/utils';

import { TournamentRegistrationsComponent } from './tournament-registrations.component';

describe('TournamentRegistrationsComponent', () => {
  let fixture: ComponentFixture<TournamentRegistrationsComponent>;

  // Tuesday evening in London, Ontario
  const NOW = new Date('2026-10-06T23:00:00.000Z');

  const summary = (overrides: Partial<TournamentSummary>): TournamentSummary => ({
    ...MOCK_UPCOMING_SUMMARY,
    date: '2026-10-20',
    endDate: null,
    registrationOpens: '2026-10-01T04:00:00.000Z',
    registrationCloses: '2026-10-19T04:00:00.000Z',
    ...overrides,
  });

  const render = (summaries: TournamentSummary[], isLoading = false): void => {
    fixture.componentRef.setInput('summaries', summaries);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
  };

  const cards = () =>
    queryAll(
      fixture.debugElement,
      '.registrations:not(.registrations--reserve) lcc-tournament-card',
    );
  const namesOnCards = () =>
    cards().map(card => card.componentInstance.summary()?.name ?? null);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    TestBed.configureTestingModule({
      imports: [TournamentRegistrationsComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(TournamentRegistrationsComponent);
  });

  afterEach(() => vi.useRealTimers());

  it('should list the tournaments taking registrations soonest first', () => {
    render([
      summary({ number: 2, name: 'Fall Rapid', date: '2026-11-03' }),
      summary({ number: 1, name: 'Club Blitz' }),
    ]);

    expect(namesOnCards()).toEqual(['Club Blitz', 'Fall Rapid']);
  });

  it('should keep a tournament under way, but leave out finished ones and those without online registration', () => {
    render([
      summary({
        number: 1,
        name: 'Under Way',
        date: '2026-10-01',
        endDate: '2026-10-20',
      }),
      summary({ number: 2, name: 'Finished', date: '2026-09-01', endDate: '2026-09-15' }),
      summary({
        number: 3,
        name: 'In Person',
        registrationOpens: null,
        registrationCloses: null,
      }),
    ]);

    expect(namesOnCards()).toEqual(['Under Way']);
  });

  it('should fall back to one large way into the tournaments when none take registrations', () => {
    render([summary({ registrationOpens: null, registrationCloses: null })]);

    const button = query(fixture.debugElement, '.stack > .register-button');

    expect(cards()).toHaveLength(0);
    expect(
      query(fixture.debugElement, '.registrations--reserve').attributes['aria-hidden'],
    ).toBe('true');
    expect(button.nativeElement.textContent.trim()).toBe('Register for a tournament');
    expect(button.injector.get(RouterLink).urlTree?.toString()).toBe('/tournaments');
  });

  it('should hold the place of a tournament card while they load', () => {
    render([], true);

    const reserve = query(fixture.debugElement, '.registrations');

    expect(reserve.attributes['aria-busy']).toBe('true');
    expect(query(reserve, 'lcc-tournament-card').componentInstance.summary()).toBeNull();
    expect(query(fixture.debugElement, '.stack > .register-button')).toBeNull();
  });
});
