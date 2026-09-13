/**
 * First and last initials of a full name, uppercased (e.g. `'Jo Ann Smith'`
 * gives `'JS'`), or `undefined` for a blank name.
 */
export function getInitials(name: string): string | undefined {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase() || undefined;
}
