import { PAGE_SIZE_ALL } from '@eagami/ui';

// The rows a page holds: its page size, or every row when the page size is "all"
export function pageRowCount(pageSize: number, rowCount: number): number {
  return pageSize === PAGE_SIZE_ALL ? rowCount : pageSize;
}
