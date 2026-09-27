/**
 * A rating as the API sorts it: provisional ratings (`1800/12`) rank by their game
 * count, just below an established rating of the same value.
 */
export function ratingSortValue(rating: string): number {
  const [base, gameCount] = rating.split('/');
  return Number(base) + (gameCount === undefined ? 0.1 : Number(gameCount) / 1000);
}
