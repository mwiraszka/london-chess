// A record number written into a route, which counts only when it is all digits
export function parseRecordNumber(value: string): number | null {
  return /^\d+$/.test(value) ? Number(value) : null;
}
