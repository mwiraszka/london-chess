import * as Sentry from '@sentry/node';
import type { Transporter } from 'nodemailer';

import { EmailContent } from '../util/email-template.util';

const SMTP_HOST = 'smtppro.zoho.com';
const SMTP_PORT = 465;
const SENDER = 'London Chess <noreply@londonchess.ca>';
// Each email waits for the server to accept it, so a mailing to every member shares out
// over a few connections to finish well inside the function's time limit
const MAILING_CONNECTIONS = 3;

let transport: Transporter | null = null;

interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
}

export interface OutgoingEmail {
  to: string;
  content: EmailContent;
}

function smtpOptions(): SmtpOptions {
  const { ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD } = process.env;
  if (!ZOHO_SMTP_USER || !ZOHO_SMTP_PASSWORD) {
    throw new Error('Unable to parse SMTP environment variables.');
  }
  return {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: { user: ZOHO_SMTP_USER, pass: ZOHO_SMTP_PASSWORD },
  };
}

export async function sendEmail(
  to: string,
  { subject, text, html }: EmailContent,
): Promise<void> {
  const options = smtpOptions();

  // Loaded on first use, so only a request that sends mail pays for it
  const { default: nodemailer } = await import('nodemailer');
  transport ??= nodemailer.createTransport(options);

  await transport.sendMail({
    from: SENDER,
    to,
    subject,
    text,
    html,
  });
}

/**
 * Sends the emails in turn over a few pooled SMTP connections, so a mailing to every member
 * logs in to the mail server a few times rather than once per email. Gives, in order,
 * whether each email was sent, and reports each one that was not with the server's reply.
 */
export async function sendEmails(
  emails: OutgoingEmail[],
  purpose: string,
): Promise<boolean[]> {
  if (!emails.length) {
    return [];
  }
  const options = smtpOptions();
  const { default: nodemailer } = await import('nodemailer');
  const pool = nodemailer.createTransport({
    ...options,
    pool: true,
    maxConnections: MAILING_CONNECTIONS,
  });
  try {
    const results = await Promise.allSettled(
      emails.map(({ to, content }) => pool.sendMail({ from: SENDER, to, ...content })),
    );
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return true;
      }
      reportUnsent(purpose, result.reason, emails[index].to);
      return false;
    });
  } finally {
    pool.close();
  }
}

// The server's reply can quote the recipient, whose address stays out of the report
function reportUnsent(purpose: string, error: unknown, to: string): void {
  const reply = (error instanceof Error ? error.message : String(error)).replaceAll(
    to,
    '<recipient>',
  );
  const message = `Unable to send ${purpose} email: ${reply}`;
  console.error(`[LCC] ${message}`);
  Sentry.captureException(new Error(message), {
    tags: { purpose },
    extra: smtpDetails(error),
  });
}

function smtpDetails(error: unknown): Record<string, unknown> {
  return typeof error === 'object' && error !== null
    ? {
        code: 'code' in error ? error.code : undefined,
        responseCode: 'responseCode' in error ? error.responseCode : undefined,
        command: 'command' in error ? error.command : undefined,
      }
    : {};
}

// Sends a notification to the club admin mailbox over Zoho SMTP
export async function sendAdminEmail(email: EmailContent): Promise<void> {
  const { NOTIFY_EMAIL } = process.env;
  if (!NOTIFY_EMAIL) {
    throw new Error('Unable to parse SMTP environment variables.');
  }
  await sendEmail(NOTIFY_EMAIL, email);
}
