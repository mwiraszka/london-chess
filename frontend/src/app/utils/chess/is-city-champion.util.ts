import { Member } from '@app/models';

// Members carry no championship field, so the reigning champion is named here
export const CITY_CHAMPION: Pick<Member, 'firstName' | 'lastName'> = {
  firstName: 'Rene',
  lastName: 'Bartar',
};

export function isCityChampion(member: Pick<Member, 'firstName' | 'lastName'>): boolean {
  return (
    member.firstName === CITY_CHAMPION.firstName &&
    member.lastName === CITY_CHAMPION.lastName
  );
}
