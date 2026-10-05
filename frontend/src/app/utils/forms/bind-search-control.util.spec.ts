import { BehaviorSubject } from 'rxjs';

import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { SEARCH_DEBOUNCE } from '@app/constants/filters';
import { Article, DataPaginationOptions } from '@app/models';

import { bindSearchControl } from './bind-search-control.util';

describe('bindSearchControl', () => {
  const initialOptions: DataPaginationOptions<Article> = {
    page: 3,
    pageSize: 10,
    sortBy: 'bookmarkDate',
    sortOrder: 'desc',
    filters: null,
    search: '',
  };

  let control: FormControl<string>;
  let options$: BehaviorSubject<DataPaginationOptions<Article>>;
  let search: Mock<(options: DataPaginationOptions<Article>) => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    control = new FormControl('', { nonNullable: true });
    options$ = new BehaviorSubject(initialOptions);
    search = vi.fn();
    bindSearchControl(control, options$, search, TestBed.inject(DestroyRef));
  });

  afterEach(() => vi.useRealTimers());

  it('should search from the first page once typing pauses', () => {
    control.setValue('blitz');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE - 1);
    const searchedEarly = search.mock.calls.length;

    vi.advanceTimersByTime(1);

    expect(searchedEarly).toBe(0);
    expect(search).toHaveBeenCalledExactlyOnceWith({
      ...initialOptions,
      search: 'blitz',
      page: 1,
    });
  });

  it('should not search again for the same text', () => {
    control.setValue('blitz');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);

    control.setValue('blit');
    control.setValue('blitz');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);

    expect(search).toHaveBeenCalledOnce();
  });

  it('should show a search set elsewhere without searching for it again', () => {
    options$.next({ ...initialOptions, search: 'rapid' });

    vi.advanceTimersByTime(SEARCH_DEBOUNCE);

    expect(control.value).toBe('rapid');
    expect(search).not.toHaveBeenCalled();
  });

  it('should stop once its owner is destroyed', () => {
    TestBed.resetTestingModule();

    control.setValue('blitz');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);

    expect(search).not.toHaveBeenCalled();
  });
});
