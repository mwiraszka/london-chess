import {
  EmailBlock,
  EmailContent,
  EmailTableGroup,
  buildEmail,
  codeBlock,
  groupedTable,
  link,
  mailtoLink,
  paragraph,
  table,
} from './email-template.util';
import { MemberChange, isRatingChangeOnly } from './member-changes.util';
import { ScheduleChange } from './schedule-changes.util';

export type ChangeRow = Pick<MemberChange, 'label' | 'before' | 'after'>;

const CLUB_NAME = 'London Chess';
const CLUB_EMAIL = 'welcome@londonchess.ca';
const CHANGED_EVENT_COLUMNS = ['Event', 'Detail', 'Previous', 'New'];

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
  preferencesUrl: string,
): EmailContent {
  const isRatingOnly = isRatingChangeOnly(changes);
  const subject = isRatingOnly
    ? 'Your London Chess rating has been updated'
    : 'Your London Chess member details have been updated';

  return buildEmail(subject, CLUB_NAME, [
    paragraph(`Hi ${member.firstName},`),
    paragraph('These details on your London Chess member record have been updated:'),
    changesTable(changes, ['Detail', 'Previous', 'New']),
    paragraph('See your member profile: ', link(profileUrl)),
    paragraph('If anything looks wrong, email us at ', mailtoLink(CLUB_EMAIL), '.'),
    ...(isRatingOnly
      ? [
          paragraph(
            'To stop these emails, turn off rating change notifications in your account preferences: ',
            link(preferencesUrl),
          ),
        ]
      : []),
  ]);
}

export function buildScheduleChangeEmail(
  member: { firstName: string },
  change: ScheduleChange,
  scheduleUrl: string,
  preferencesUrl: string,
): EmailContent {
  const { kind, title, when, type } = change;
  const subject = {
    added: `New on the London Chess schedule: ${title}`,
    changed: `London Chess schedule change: ${title}`,
    removed: `Removed from the London Chess schedule: ${title}`,
  }[kind];
  const summary = {
    added: [
      paragraph(`${title} has been added to the London Chess schedule.`),
      table([
        ['Date and time', when],
        ['Type', type],
      ]),
    ],
    changed: [
      paragraph(`${title} has changed on the London Chess schedule.`),
      groupedTable([changedEvent(change)], CHANGED_EVENT_COLUMNS),
    ],
    removed: [
      paragraph(`${title} on ${when} has been removed from the London Chess schedule.`),
    ],
  }[kind];

  return buildEmail(subject, CLUB_NAME, [
    paragraph(`Hi ${member.firstName},`),
    ...summary,
    paragraph('See the schedule: ', link(scheduleUrl)),
    paragraph(
      'To stop these emails, turn off schedule change notifications in your account preferences: ',
      link(preferencesUrl),
    ),
  ]);
}

// One email for any number of changes, a single one told as it always was
export function buildScheduleChangesEmail(
  member: { firstName: string },
  changes: ScheduleChange[],
  scheduleUrl: string,
  preferencesUrl: string,
): EmailContent {
  if (changes.length === 1) {
    return buildScheduleChangeEmail(member, changes[0], scheduleUrl, preferencesUrl);
  }
  const ofKind = (kind: ScheduleChange['kind']) =>
    changes.filter(change => change.kind === kind);
  const added = ofKind('added');
  const changed = ofKind('changed');
  const removed = ofKind('removed');

  return buildEmail('London Chess schedule changes', CLUB_NAME, [
    paragraph(`Hi ${member.firstName},`),
    paragraph('The London Chess schedule has changed.'),
    ...(added.length
      ? [
          paragraph('Added:'),
          table(
            added.map(({ title, when, type }) => [title, when, type]),
            ['Event', 'Date and time', 'Type'],
          ),
        ]
      : []),
    ...(changed.length
      ? [
          paragraph('Changed:'),
          groupedTable(changed.map(changedEvent), CHANGED_EVENT_COLUMNS),
        ]
      : []),
    ...(removed.length
      ? [
          paragraph('Removed:'),
          table(
            removed.map(({ title, when }) => [title, when]),
            ['Event', 'Date and time'],
          ),
        ]
      : []),
    paragraph('See the schedule: ', link(scheduleUrl)),
    paragraph(
      'To stop these emails, turn off schedule change notifications in your account preferences: ',
      link(preferencesUrl),
    ),
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

function changedEvent({ title, day, rows }: ScheduleChange): EmailTableGroup {
  return {
    label: `${title} (${day})`,
    rows: rows.map(({ label, before, after }) => [label, before, after]),
  };
}

function changesTable(changes: ChangeRow[], columns: string[]): EmailBlock {
  return table(
    changes.map(({ label, before, after }) => [label, before, after]),
    columns,
  );
}
