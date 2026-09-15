import { escapeHtml } from './html.util';
import { MemberChange, isRatingChangeOnly } from './member-changes.util';

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const CLUB_EMAIL = 'welcome@londonchess.ca';

export function buildWelcomeEmail(
  member: { firstName: string; email: string },
  temporaryPassword: string,
  siteUrl: string,
  profileUrl: string,
): EmailContent {
  const loginInstructions = 'Your London Chess account is ready. Log in at';
  const firstLogin =
    "You'll be asked to set your own password the first time you log in.";

  const text = [
    `Hi ${member.firstName},`,
    `${loginInstructions} ${siteUrl} with ${member.email} and this temporary password:`,
    temporaryPassword,
    firstLogin,
    `See your member profile: ${profileUrl}`,
  ].join('\n\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <h2 style="margin: 0 0 16px;">London Chess</h2>
      <p style="margin: 0 0 16px;">Hi ${escapeHtml(member.firstName)},</p>
      <p style="margin: 0 0 16px;">${loginInstructions} ${link(siteUrl)} with ${escapeHtml(member.email)} and this temporary password:</p>
      <p style="margin: 0 0 16px; font-family: monospace; font-size: 20px; font-weight: bold; letter-spacing: 2px;">${escapeHtml(temporaryPassword)}</p>
      <p style="margin: 0 0 16px;">${firstLogin}</p>
      <p style="margin: 0;">See your member profile: ${link(profileUrl)}</p>
    </div>`;

  return { subject: 'Your London Chess account is ready', text, html };
}

export function buildMemberChangesEmail(
  member: { firstName: string },
  changes: MemberChange[],
  profileUrl: string,
): EmailContent {
  const subject = isRatingChangeOnly(changes)
    ? 'Your London Chess rating has been updated'
    : 'Your London Chess member details have been updated';
  const intro = 'These details on your London Chess member record have been updated:';

  const text = [
    `Hi ${member.firstName},`,
    intro,
    changes
      .map(({ label, before, after }) => `${label}: ${after} (previously ${before})`)
      .join('\n'),
    `See your member profile: ${profileUrl}`,
    `If anything looks wrong, email us at ${CLUB_EMAIL}.`,
  ].join('\n\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <h2 style="margin: 0 0 16px;">London Chess</h2>
      <p style="margin: 0 0 16px;">Hi ${escapeHtml(member.firstName)},</p>
      <p style="margin: 0 0 16px;">${intro}</p>
      <table style="border-collapse: collapse; margin: 0 0 16px;">
        <tr>
          <td style="padding: 6px 16px 6px 0; font-weight: bold;">Detail</td>
          <td style="padding: 6px 16px 6px 0; font-weight: bold;">Previous</td>
          <td style="padding: 6px 0; font-weight: bold;">New</td>
        </tr>
        ${changes
          .map(
            ({ label, before, after }) => `
              <tr>
                <td style="padding: 6px 16px 6px 0;">${escapeHtml(label)}</td>
                <td style="padding: 6px 16px 6px 0;">${escapeHtml(before)}</td>
                <td style="padding: 6px 0;">${escapeHtml(after)}</td>
              </tr>`,
          )
          .join('')}
      </table>
      <p style="margin: 0 0 16px;">See your member profile: ${link(profileUrl)}</p>
      <p style="margin: 0;">If anything looks wrong, email us at <a href="mailto:${CLUB_EMAIL}">${CLUB_EMAIL}</a>.</p>
    </div>`;

  return { subject, text, html };
}

function link(url: string): string {
  return `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`;
}
