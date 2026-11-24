import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query, queryAll } from '@app/utils';

import { CountdownComponent } from './countdown.component';

describe('CountdownComponent', () => {
  let fixture: ComponentFixture<CountdownComponent>;

  const NOW = new Date('2026-11-24T12:00:00.000Z');
  const SECOND = 1_000;

  const at = (offset: number): string => new Date(NOW.getTime() + offset).toISOString();

  // The digit showing in each place, and the separators between the units
  const shown = (): string =>
    queryAll(fixture.debugElement, '.countdown__glyph--shown, .countdown__separator')
      .map(element => element.nativeElement.textContent.trim())
      .join('');

  const render = (until: string): void => {
    fixture.componentRef.setInput('until', until);
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    TestBed.configureTestingModule({ imports: [CountdownComponent] });
    fixture = TestBed.createComponent(CountdownComponent);
  });

  afterEach(() => vi.useRealTimers());

  it('should tick down each second, every place on its own tile', () => {
    render(at(3 * 60 * SECOND + 2 * SECOND));
    const before = shown();

    vi.advanceTimersByTime(SECOND);
    fixture.detectChanges();

    expect(before).toBe('00:00:03:02');
    expect(shown()).toBe('00:00:03:01');
    expect(query(fixture.debugElement, '.countdown').attributes['aria-label']).toBe(
      '3 minutes, 1 second',
    );
  });

  it('should stop at zero once the instant has passed', () => {
    render(at(-SECOND));

    expect(shown()).toBe('00:00:00:00');
  });
});
