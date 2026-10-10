import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { ApiResponse } from '@app/models';

/**
 * The rows holding each column's widest content, which a table is sized by: null while
 * they are on their way, so the page opens at once and the table holds its place until
 * they arrive. A failed request leaves the table to fit the rows it is given. Called
 * from an injection context.
 */
export function widestRows<T>(
  response: Observable<ApiResponse<T[]>>,
): Signal<T[] | null> {
  return toSignal(
    response.pipe(
      map(({ data }) => data),
      catchError(() => of([])),
    ),
    { initialValue: null },
  );
}
