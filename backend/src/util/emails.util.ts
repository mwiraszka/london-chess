import {
  EmailBlock,
  EmailContent,
  buildEmail,
  codeBlock,
  link,
  mailtoLink,
  paragraph,
  table,
} from './email-template.util';
import { MemberChange, isRatingChangeOnly } from './member-changes.util';

export type ChangeRow = Pick<MemberChange, 'label' | 'before' | 'after'>;

const CLUB_NAME = 'London Chess';
const CLUB_EMAIL = 'welcome@londonchess.ca';

export function buildWelcomeEmail(
  member: { firstName: string; email: string },
  temporaryPassword: string,
  loginUrl: string,
  profileUrl: string,
): EmailContent {
  return buildEmail('Your London Chess account is ready', CLUB_NAME, [
    paragraph(`Hi ${member.firstName},`),
    paragraph(
      'Your London Chess account is ready. Log in at ',
      link(loginUrl),
      ` with ${member.email} and this temporary password:`,
    ),
    codeBlock(temporaryPassword),
    paragraph("You'll be asked to set your own password the first time you log in."),
    paragraph('See your member profile: ', link(profileUrl)),
  ]);
}

export function buildMemberChangesEmail(
  member: { firstName: string },
  changes: MemberChange[],
  profileUrl: string,
): EmailContent {
  const subject = isRatingChangeOnly(changes)
    ? 'Your London Chess rating has been updated'
    : 'Your London Chess member details have been updated';

  return buildEmail(subject, CLUB_NAME, [
    paragraph(`Hi ${member.firstName},`),
    paragraph('These details on your London Chess member record have been updated:'),
    changesTable(changes, ['Detail', 'Previous', 'New']),
    paragraph('See your member profile: ', link(profileUrl)),
    paragraph('If anything looks wrong, email us at ', mailtoLink(CLUB_EMAIL), '.'),
  ]);
}

export function buildVerificationCodeEmail(code: string): EmailContent {
  return buildEmail('Your London Chess verification code', CLUB_NAME, [
    paragraph('Use this code to verify your email address. It expires in 10 minutes.'),
    codeBlock(code),
  ]);
}

export function buildDetailsChangeRequestEmail(
  memberName: string,
  changes: ChangeRow[],
): EmailContent {
  return buildEmail(
    `Member details change request from ${memberName}`,
    'Member details change request',
    [
      paragraph(`${memberName} has requested these changes to their member record.`),
      changesTable(changes, ['Field', 'Current', 'Requested']),
    ],
  );
}

export function buildAccountRequestEmail(
  name: string,
  details: Array<[label: string, value: string]>,
): EmailContent {
  return buildEmail(`New account request from ${name}`, 'New account request', [
    paragraph('Someone has requested a London Chess account.'),
    table(details),
  ]);
}

function changesTable(changes: ChangeRow[], columns: string[]): EmailBlock {
  return table(
    changes.map(({ label, before, after }) => [label, before, after]),
    columns,
  );
}
