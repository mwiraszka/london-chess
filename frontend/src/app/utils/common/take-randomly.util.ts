/**
 * Take N-number random items from an array if N defined; otherwise return the full array.
 *
 * @param array The array (any type)
 * @param n The number of items to take
 */
export function takeRandomly<T>(array: T[], n?: number): T[] {
  return array.sort(() => 0.5 - Math.random()).slice(0, n ?? array?.length ?? 0);
}
