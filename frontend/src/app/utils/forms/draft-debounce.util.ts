import { MonoTypeOperatorFunction, Observable, timer } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';

import { FORM_CHANGE_DEBOUNCE } from '@app/constants/forms';

// Passes a form's changes on once typing pauses. A save sends the latest values itself, so it
// drops any change still waiting: nothing may follow a save and bring back the draft it clears
export function draftDebounce<T>(saved: Observable<void>): MonoTypeOperatorFunction<T> {
  return switchMap(change =>
    timer(FORM_CHANGE_DEBOUNCE).pipe(
      takeUntil(saved),
      map(() => change),
    ),
  );
}
