/**
 * Convert a camelCaseString to 'Sentence case string'.
 */
export function camelCaseToSentenceCase(value: string): string {
  const withSpaces = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
}
