import { PAGE_SIZE_ALL } from '@eagami/ui';

import { pageRowCount } from './page-row-count.util';

describe('pageRowCount', () => {
  it('should return the page size', () => {
    const count = pageRowCount(20, 137);

    expect(count).toBe(20);
  });

  it('should return every row when the page size is all', () => {
    const count = pageRowCount(PAGE_SIZE_ALL, 137);

    expect(count).toBe(137);
  });
});
