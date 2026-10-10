import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';

import { MOCK_UPCOMING_SUMMARY } from '@app/mocks/tournaments.mock';
import { TournamentSummary } from '@app/models';
import { query, queryAll } from '@app/utils';

import { TournamentCardComponent } from './tournament-card.component';

describe('TournamentCardComponent', () => {
  let fixture: ComponentFixture<TournamentCardComponent>;

  const NOW = new Date('2026-10-06T23:00:00.000Z');
  const SECOND = 1_000;
  const DAY = 86_400 * SECOND;

  const at = (offset: number): string => new Date(NOW.getTime() + offset).toISOString();

  const render = (overrides: Partial<TournamentSummary> | null): void => {
    fixture.componentRef.setInput(
      'summary',
      overrides && { ...MOCK_UPCOMING_SUMMARY, ...overrides },
    );
    fixture.detectChanges();
  };

  const textOf = (selector: string): string =>
    query(fixture.debugElement, selector)?.nativeElement.textContent.replace(
      /\s+/g,
      '',
    ) ?? '';
  const registerButton = () => query(fixture.debugElement, '.register-button');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    TestBed.configureTestingModule({
      imports: [TournamentCardComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(TournamentCardComponent);
  });

  afterEach(() => vi.useRealTimers());

  it('should list its details, its name linking to its page', () => {
    render({});

    expect(
      queryAll(fixture.debugElement, '.card__detail').map(detail =>
        detail.nativeElement.textContent.trim(),
      ),
    ).toEqual(['Oct 15–29, 2050', 'Swiss', 'G25+5', '2 players registered']);
    expect(
      query(fixture.debugElement, '.card__name')
        .injector.get(RouterLink)
        .urlTree?.toString(),
    ).toBe(`/tournaments/${MOCK_UPCOMING_SUMMARY.number}`);
  });

  it('should count down to the second until registration opens, holding the place of its button', () => {
    render({
      registrationOpens: at(DAY + 2 * 3_600 * SECOND + 3 * 60 * SECOND + 4 * SECOND),
      registrationCloses: at(9 * DAY),
    });

    const before = textOf('.countdown');
    vi.advanceTimersByTime(SECOND);
    fixture.detectChanges();

    expect(textOf('.card__label')).toBe('Registrationopensin');
    expect(before).toBe('1d02h03m04s');
    expect(textOf('.countdown')).toBe('1d02h03m03s');
    expect(query(fixture.debugElement, '.countdown').attributes['aria-label']).toBe(
      '1 day, 2 hours, 3 minutes, 3 seconds',
    );
    expect(registerButton().classes['register-button--held']).toBe(true);
  });

  it('should offer to register once registration opens, counting down to its close', () => {
    render({ registrationOpens: at(SECOND), registrationCloses: at(2 * DAY) });

    vi.advanceTimersByTime(SECOND);
    fixture.detectChanges();

    expect(textOf('.card__label')).toBe('Registrationclosesin');
    expect(textOf('.countdown')).toBe('1d23h59m59s');
    expect(registerButton().classes['register-button--held']).toBeFalsy();
    expect(registerButton().attributes['aria-label']).toBe(
      `Register for ${MOCK_UPCOMING_SUMMARY.name}`,
    );
  });

  it('should say registration has closed', () => {
    render({ registrationOpens: at(-9 * DAY), registrationCloses: at(-DAY) });

    expect(textOf('.card__status')).toBe('RegistrationClosed');
    expect(registerButton().classes['register-button--held']).toBe(true);
  });

  it('should leave out registration for a tournament that takes none online', () => {
    render({ registrationOpens: null, registrationCloses: null });

    expect(query(fixture.debugElement, '.card__status')).toBeNull();
    expect(registerButton()).toBeNull();
  });

  it('should hold the shape of a card while the tournaments load', () => {
    render(null);

    expect(queryAll(fixture.debugElement, 'lcc-text-skeleton')).toHaveLength(4);
    expect(registerButton().classes['register-button--held']).toBe(true);
  });

  it('should keep its details to one line when asked', () => {
    fixture.componentRef.setInput('detailsOnOneLine', true);
    render({});

    expect(
      query(fixture.debugElement, '.card__details').classes['card__details--one-line'],
    ).toBe(true);
  });
});
