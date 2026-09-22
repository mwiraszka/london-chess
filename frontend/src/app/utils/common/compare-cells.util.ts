// Orders two rows by a column the way the data table does, so rows sorted here keep
// their order once the table sorts the page it is given
export function compareCells<T extends object>(a: T, b: T, column: string): number {
  const key = column as keyof T;
  const [left, right] = [a[key], b[key]];
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return -1;
  }
  if (right == null) {
    return 1;
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left).localeCompare(String(right));
}
