import { PAGE_SIZE_ALL } from '@eagami/ui';

// The rows of a page, or every row when the page size is "all"
export function pageOf<T>(rows: T[], page: number, pageSize: number): T[] {
  if (pageSize === PAGE_SIZE_ALL) {
    return rows;
  }
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
