/**
 * Transform a raw number of Bytes to a more user-friendly size in `B` / `kB` / `MB` / `GB` units.
 */
export function formatBytes(value: unknown, decimalDigits = 2): string {
  const bytes = Number(value);

  if (!['number', 'string'].includes(typeof value) || isNaN(bytes) || bytes === 0) {
    return '0 B';
  }

  decimalDigits = decimalDigits < 0 ? 0 : decimalDigits;
  const sizes = ['B', 'kB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(decimalDigits))} ${sizes[i]}`;
}
