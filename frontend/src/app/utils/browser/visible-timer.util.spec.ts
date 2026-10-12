import { visibleTimer } from './visible-timer.util';

describe('visibleTimer', () => {
  let visibility: DocumentVisibilityState;

  function setVisibility(state: DocumentVisibilityState): void {
    visibility = state;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('should tick on schedule while the page is in view', () => {
    const ticks: number[] = [];

    const subscription = visibleTimer(0, 1000).subscribe(tick => ticks.push(tick));
    vi.advanceTimersByTime(2000);
    subscription.unsubscribe();

    expect(ticks).toEqual([0, 1, 2]);
  });

  it('should stop ticking while the page is hidden', () => {
    const ticks: number[] = [];
    const subscription = visibleTimer(0, 1000).subscribe(tick => ticks.push(tick));
    vi.advanceTimersByTime(0);

    setVisibility('hidden');
    vi.advanceTimersByTime(5000);
    subscription.unsubscribe();

    expect(ticks).toEqual([0]);
  });

  it('should start over when the page comes back into view', () => {
    const ticks: number[] = [];
    const subscription = visibleTimer(0, 1000).subscribe(tick => ticks.push(tick));
    vi.advanceTimersByTime(1000);
    setVisibility('hidden');
    vi.advanceTimersByTime(5000);

    setVisibility('visible');
    vi.advanceTimersByTime(1000);
    subscription.unsubscribe();

    expect(ticks).toEqual([0, 1, 0, 1]);
  });

  it('should tick straight away on a return, without waiting out the delay again', () => {
    const ticks: number[] = [];
    const subscription = visibleTimer(3000, 1000).subscribe(tick => ticks.push(tick));
    vi.advanceTimersByTime(1000);
    setVisibility('hidden');

    setVisibility('visible');
    vi.advanceTimersByTime(0);
    subscription.unsubscribe();

    expect(ticks).toEqual([0]);
  });

  it('should tick as soon as a page opened out of view is first seen', () => {
    visibility = 'hidden';
    const ticks: number[] = [];
    const subscription = visibleTimer(3000, 1000).subscribe(tick => ticks.push(tick));

    setVisibility('visible');
    vi.advanceTimersByTime(0);
    subscription.unsubscribe();

    expect(ticks).toEqual([0]);
  });

  it('should wait out the delay before its first tick', () => {
    const ticks: number[] = [];

    const subscription = visibleTimer(3000, 1000).subscribe(tick => ticks.push(tick));
    vi.advanceTimersByTime(2999);
    subscription.unsubscribe();

    expect(ticks).toEqual([]);
  });
});
