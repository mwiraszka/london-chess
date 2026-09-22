import { PAGE_SIZE_ALL } from '@eagami/ui';

import { pageOf } from './page-of.util';

describe('pageOf', () => {
  const rows = ['a', 'b', 'c', 'd', 'e'];

  it('should return the rows of the given page', () => {
    const page = pageOf(rows, 2, 2);

    expect(page).toEqual(['c', 'd']);
  });

  it('should return a shorter last page', () => {
    const page = pageOf(rows, 3, 2);

    expect(page).toEqual(['e']);
  });

  it('should return every row when the page size is all', () => {
    const page = pageOf(rows, 1, PAGE_SIZE_ALL);

    expect(page).toBe(rows);
  });
});
