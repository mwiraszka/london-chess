import { EMPTY, Observable, fromEvent, timer } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';

// A timer that runs only while the page is in view. The delay holds back the first tick
// only, so each return to the page ticks straight away, catching up on what it missed
export function visibleTimer(dueTime: number, period: number): Observable<number> {
  return fromEvent(document, 'visibilitychange').pipe(
    startWith(null),
    map(() => document.visibilityState === 'visible'),
    distinctUntilChanged(),
    switchMap((isVisible, change) =>
      isVisible ? timer(change === 0 ? dueTime : 0, period) : EMPTY,
    ),
  );
}
