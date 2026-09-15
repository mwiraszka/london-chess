import { HttpParams } from '@angular/common/http';

import { DataPaginationOptions, Event, Image } from '@app/models';

import { setPaginationParams } from './set-pagination-params.util';

describe('setPaginationParams', () => {
  it('should handle options with filters', () => {
    const options: DataPaginationOptions<Event> = {
      page: 5,
      pageSize: 100,
      sortBy: 'title',
      sortOrder: 'desc',
      filters: {
        showPastEvents: {
          label: 'Some custom label...',
          value: true,
        },
      },
      search: 'some text',
    };

    const expectedParams = new HttpParams()
      .set('page', '5')
      .set('pageSize', '100')
      .set('sortBy', 'title')
      .set('sortOrder', 'desc')
      .set('search', 'some text')
      .set('filter_showPastEvents', 'true');
    expect(setPaginationParams(options).toString()).toEqual(expectedParams.toString());
  });

  it('should handle options without filters', () => {
    const options: DataPaginationOptions<Image> = {
      page: 2,
      pageSize: 100,
      sortBy: 'id',
      sortOrder: 'asc',
      search: 'some text',
      filters: null,
    };

    const expectedParams = new HttpParams()
      .set('page', '2')
      .set('pageSize', '100')
      .set('sortBy', 'id')
      .set('sortOrder', 'asc')
      .set('search', 'some text');
    expect(setPaginationParams(options).toString()).toEqual(expectedParams.toString());
  });

  it('should ignore empty string search query', () => {
    const options: DataPaginationOptions<Image> = {
      page: 3,
      pageSize: 50,
      sortBy: 'albumOrdinality',
      sortOrder: 'desc',
      search: '',
      filters: null,
    };

    const expectedParams = new HttpParams()
      .set('page', '3')
      .set('pageSize', '50')
      .set('sortBy', 'albumOrdinality')
      .set('sortOrder', 'desc');
    expect(setPaginationParams(options).toString()).toEqual(expectedParams.toString());
  });
});
