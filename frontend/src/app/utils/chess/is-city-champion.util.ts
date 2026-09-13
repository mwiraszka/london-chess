import { Member } from '@app/models';

// Members carry no championship field, so the reigning champion is named here
export function isCityChampion(member: Pick<Member, 'firstName' | 'lastName'>): boolean {
  return member.firstName === 'Rene' && member.lastName === 'Bartar';
}
