import { isUnrated } from './is-unrated.util';

/**
 * A rating as the API sorts it: provisional ratings (`1800/12`) rank by their game
 * count, just below an established rating of the same value, and an unrated member ranks
 * below every rated one.
 */
export function ratingSortValue(rating: string): number {
  if (isUnrated(rating)) {
    return 0;
  }
  const [base, gameCount] = rating.split('/');
  return Number(base) + (gameCount === undefined ? 0.1 : Number(gameCount) / 1000);
}
