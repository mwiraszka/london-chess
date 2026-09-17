import { Actions } from '@ngrx/effects';
import { Action, ActionCreator, Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StoreRequestService {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  // Settles with the first outcome action to follow the request
  dispatch(
    request: Action,
    outcomes: [ActionCreator, ...ActionCreator[]],
  ): Promise<Action> {
    const outcome = firstValueFrom(
      this.actions$.pipe(
        filter(action => outcomes.some(({ type }) => type === action.type)),
      ),
    );
    this.store.dispatch(request);
    return outcome;
  }
}
