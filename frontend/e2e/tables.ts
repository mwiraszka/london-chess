import { Locator } from '@playwright/test';

// The rows a visitor sees, leaving out the hidden rows that size the columns
export function bodyRows(table: Locator): Locator {
  return table.locator('tbody.ea-data-table__body > tr.ea-data-table__row');
}
