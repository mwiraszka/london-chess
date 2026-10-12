import { EMPTY, Observable, fromEvent, timer } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';

// A timer that runs only while the page is in view, starting over each time it returns
export function visibleTimer(dueTime: number, period: number): Observable<number> {
  return fromEvent(document, 'visibilitychange').pipe(
    startWith(null),
    map(() => document.visibilityState === 'visible'),
    distinctUntilChanged(),
    switchMap(isVisible => (isVisible ? timer(dueTime, period) : EMPTY)),
  );
}
