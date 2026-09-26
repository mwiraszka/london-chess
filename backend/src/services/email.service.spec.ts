import { EmailContent } from '../util/email-template.util';

const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn<(message: Record<string, string>) => Promise<object>>(
    async () => ({}),
  );
  return {
    sendMail,
    createTransport: vi.fn<(options: object) => { sendMail: typeof sendMail }>(() => ({
      sendMail,
    })),
  };
});

vi.mock('nodemailer', () => ({ default: { createTransport } }));

const EMAIL: EmailContent = { subject: 'Subject', text: 'Text', html: '<p>Text</p>' };

// The transport is kept between sends, so each test loads a fresh copy of the service
async function loadService() {
  vi.resetModules();
  return import('./email.service.js');
}

describe('email service', () => {
  beforeEach(() => {
    vi.stubEnv('ZOHO_SMTP_USER', 'noreply@londonchess.ca');
    vi.stubEnv('ZOHO_SMTP_PASSWORD', 'secret');
    vi.stubEnv('NOTIFY_EMAIL', 'admin@londonchess.ca');
  });

  it('should send over one secure transport from the club address', async () => {
    const { sendEmail } = await loadService();

    await sendEmail('jane@example.com', EMAIL);
    await sendEmail('john@example.com', EMAIL);

    expect(createTransport).toHaveBeenCalledOnce();
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        secure: true,
        auth: { user: 'noreply@londonchess.ca', pass: 'secret' },
      }),
    );
    expect(sendMail).toHaveBeenLastCalledWith({
      from: 'London Chess <noreply@londonchess.ca>',
      to: 'john@example.com',
      subject: 'Subject',
      text: 'Text',
      html: '<p>Text</p>',
    });
  });

  it('should refuse to send without SMTP credentials', async () => {
    vi.stubEnv('ZOHO_SMTP_PASSWORD', '');
    const { sendEmail } = await loadService();

    await expect(sendEmail('jane@example.com', EMAIL)).rejects.toThrow(
      'Unable to parse SMTP environment variables.',
    );
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('should send admin notifications to the club mailbox', async () => {
    const { sendAdminEmail } = await loadService();

    await sendAdminEmail(EMAIL);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin@londonchess.ca' }),
    );
  });

  it('should refuse an admin notification without a mailbox', async () => {
    vi.stubEnv('NOTIFY_EMAIL', '');
    const { sendAdminEmail } = await loadService();

    await expect(sendAdminEmail(EMAIL)).rejects.toThrow(
      'Unable to parse SMTP environment variables.',
    );
  });
});
