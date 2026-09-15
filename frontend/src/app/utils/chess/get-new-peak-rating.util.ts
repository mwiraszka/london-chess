/**
 * Return new peak Elo rating based on current rating and current peak rating.
 */
export function getNewPeakRating(rating: string, peakRating: string): string {
  const [_rating, provisionalRatingCount] = rating.split('/');
  const [_peakRating, provisionalPeakRatingCount] = peakRating.split('/');

  const ratingNum = Number(_rating);
  const peakRatingNum = Number(_peakRating);

  if (
    isNaN(ratingNum) ||
    isNaN(peakRatingNum) ||
    (provisionalRatingCount !== undefined && isNaN(Number(provisionalRatingCount))) ||
    (provisionalPeakRatingCount !== undefined &&
      isNaN(Number(provisionalPeakRatingCount)))
  ) {
    console.error('[LCC] Unable to parse ratings to determine new peak rating');
    return '0';
  }

  const surpassedCurrentPeakRating = ratingNum > peakRatingNum;
  const firstNonProvisionalRating = !rating.includes('/') && peakRating.includes('/');

  return surpassedCurrentPeakRating || firstNonProvisionalRating ? rating : peakRating;
}
