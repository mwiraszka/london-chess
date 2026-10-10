import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, withLatestFrom } from 'rxjs/operators';

import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';

import { SEARCH_DEBOUNCE } from '@app/constants/filters';
import { DataPaginationOptions, EntityType } from '@app/models';

// The box shows the search in force, wherever it was set, and sends new text on a pause
export function bindSearchControl<T extends EntityType>(
  control: FormControl<string>,
  options$: Observable<DataPaginationOptions<T>>,
  search: (options: DataPaginationOptions<T>) => void,
  destroyRef: DestroyRef,
): void {
  options$.pipe(takeUntilDestroyed(destroyRef)).subscribe(options => {
    if (control.value !== options.search) {
      control.setValue(options.search, { emitEvent: false });
    }
  });

  control.valueChanges
    .pipe(
      debounceTime(SEARCH_DEBOUNCE),
      distinctUntilChanged(),
      withLatestFrom(options$),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(([text, options]) => search({ ...options, search: text, page: 1 }));
}
