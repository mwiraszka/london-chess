import { MemberRecord, UnnotifiedMember } from '../models/member.model';

type Recipient = Pick<MemberRecord, 'firstName' | 'lastName' | 'email'>;

// The recipients whose email was not sent, by surname, given whether each one was
export function unnotifiedMembers(
  recipients: Recipient[],
  sent: boolean[],
): UnnotifiedMember[] {
  return recipients
    .filter((_, index) => !sent[index])
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
    )
    .map(({ firstName, lastName, email }) => ({
      name: `${firstName} ${lastName}`,
      email,
    }));
}
