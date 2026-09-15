import nodemailer, { Transporter } from 'nodemailer';

const SMTP_HOST = 'smtppro.zoho.com';
const SMTP_PORT = 465;
const SENDER = 'London Chess <noreply@londonchess.ca>';

let transport: Transporter | null = null;

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<void> {
  const { ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD } = process.env;
  if (!ZOHO_SMTP_USER || !ZOHO_SMTP_PASSWORD) {
    throw new Error('Unable to parse SMTP environment variables.');
  }

  transport ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: { user: ZOHO_SMTP_USER, pass: ZOHO_SMTP_PASSWORD },
  });

  await transport.sendMail({
    from: SENDER,
    to,
    subject,
    text,
    html,
  });
}

// Sends a notification to the club admin mailbox over Zoho SMTP
export async function sendAdminEmail(
  subject: string,
  text: string,
  html?: string,
): Promise<void> {
  const { NOTIFY_EMAIL } = process.env;
  if (!NOTIFY_EMAIL) {
    throw new Error('Unable to parse SMTP environment variables.');
  }
  await sendEmail(NOTIFY_EMAIL, subject, text, html);
}
