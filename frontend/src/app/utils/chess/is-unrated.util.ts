import { UNRATED } from '@app/constants/member-details';

// A rating from no rated games, such as 1000/0, counts as unrated too
export function isUnrated(rating: string): boolean {
  return rating === UNRATED || rating.split('/')[1] === '0';
}
