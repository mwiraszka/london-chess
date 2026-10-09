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

  const rows = () =>
    queryAll(
      fixture.debugElement,
      '.registrations:not(.registrations--reserve) .registration',
    );
  const textOf = (element: { nativeElement: HTMLElement }): string =>
    element.nativeElement.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    TestBed.configureTestingModule({
      imports: [TournamentRegistrationsComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(TournamentRegistrationsComponent);
  });

  afterEach(() => vi.useRealTimers());

  it('should list the tournaments taking registrations, soonest first, with a way to register', () => {
    render([
      summary({ number: 2, name: 'Fall Rapid', date: '2026-11-03' }),
      summary({ number: 1, name: 'Club Blitz' }),
    ]);

    const [first, second] = rows();
    const register = query(first, '.register-button');

    expect(rows()).toHaveLength(2);
    expect(textOf(query(first, '.registration__name'))).toBe('Club Blitz');
    expect(textOf(query(second, '.registration__name'))).toBe('Fall Rapid');
    expect(register.attributes['aria-label']).toBe('Register for Club Blitz');
    expect(register.injector.get(RouterLink).urlTree?.toString()).toBe('/tournaments/1');
  });

  it('should count down to registration opening, then offer to register once it has', () => {
    render([summary({ registrationOpens: '2026-10-09T03:30:00.000Z' })]);

    const before = textOf(query(rows()[0], '.registration__status'));
    vi.advanceTimersByTime(2 * 24 * 60 * 60_000 + 4 * 60 * 60_000 + 31 * 60_000);
    fixture.detectChanges();

    expect(before).toBe('Registration opens in 2 days, 4 hours');
    expect(query(rows()[0], '.register-button')).toBeTruthy();
  });

  it('should say when registration has closed before the tournament', () => {
    render([summary({ registrationCloses: '2026-10-05T04:00:00.000Z' })]);

    expect(textOf(query(rows()[0], '.registration__status'))).toBe('Registration closed');
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

    expect(rows().map(row => textOf(query(row, '.registration__name')))).toEqual([
      'Under Way',
    ]);
  });

  it('should fall back to one large way into the tournaments when none take registrations', () => {
    render([summary({ registrationOpens: null, registrationCloses: null })]);

    const button = query(fixture.debugElement, '.register-button--large');

    expect(rows()).toHaveLength(0);
    expect(
      query(fixture.debugElement, '.registrations--reserve').attributes['aria-hidden'],
    ).toBe('true');
    expect(textOf(button)).toBe('Register for a tournament');
    expect(button.injector.get(RouterLink).urlTree?.toString()).toBe('/tournaments');
  });

  it('should hold the place of a tournament while they load', () => {
    render([], true);

    expect(rows()).toHaveLength(1);
    expect(query(fixture.debugElement, '.registrations').attributes['aria-busy']).toBe(
      'true',
    );
    expect(query(fixture.debugElement, '.register-button--large')).toBeNull();
  });
});
