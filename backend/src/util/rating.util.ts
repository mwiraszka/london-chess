// Must match UNRATED in the frontend's member details constants
export const UNRATED = 'unrated';

// A rating from no rated games, such as 1000/0, counts as unrated too
export function isUnrated(rating: string): boolean {
  return rating === UNRATED || rating.split('/')[1] === '0';
}

// The same test as an aggregation expression, for the rating the given expression holds
export function isUnratedExpression(rating: unknown) {
  return {
    $or: [
      { $eq: [rating, UNRATED] },
      { $eq: [{ $arrayElemAt: [{ $split: [rating, '/'] }, 1] }, '0'] },
    ],
  };
}
