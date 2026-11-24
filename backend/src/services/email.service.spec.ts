import { EmailContent } from '../util/email-template.util';

const { captureException, close, createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn<(message: Record<string, string>) => Promise<object>>(
    async () => ({}),
  );
  const close = vi.fn<() => void>();
  return {
    sendMail,
    close,
    createTransport: vi.fn<
      (options: object) => { sendMail: typeof sendMail; close: typeof close }
    >(() => ({ sendMail, close })),
    captureException: vi.fn<(error: unknown, context: object) => string>(() => ''),
  };
});

vi.mock('nodemailer', () => ({ default: { createTransport } }));
vi.mock('@sentry/node', () => ({ captureException }));

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

  describe('sendEmails', () => {
    it('should send every email over a few pooled connections, then close them', async () => {
      const { sendEmails } = await loadService();

      const sent = await sendEmails(
        [
          { to: 'jane@example.com', content: EMAIL },
          { to: 'john@example.com', content: EMAIL },
        ],
        'schedule change',
      );

      expect(sent).toEqual([true, true]);
      expect(createTransport).toHaveBeenCalledOnce();
      expect(createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ pool: true, maxConnections: 3, secure: true }),
      );
      expect(sendMail).toHaveBeenCalledTimes(2);
      expect(close).toHaveBeenCalledOnce();
    });

    it("should report each email not sent with the server's reply, but not its address", async () => {
      sendMail
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(
          Object.assign(
            new Error('Message failed: 550 5.4.6 Unusual activity for john@example.com'),
            { code: 'EMESSAGE', responseCode: 550, command: 'DATA' },
          ),
        );
      const { sendEmails } = await loadService();

      const sent = await sendEmails(
        [
          { to: 'jane@example.com', content: EMAIL },
          { to: 'john@example.com', content: EMAIL },
        ],
        'schedule change',
      );

      expect(sent).toEqual([true, false]);
      expect(captureException).toHaveBeenCalledOnce();
      const [error, context] = captureException.mock.calls[0];
      expect(String(error)).toBe(
        'Error: Unable to send schedule change email: Message failed: 550 5.4.6 Unusual activity for <recipient>',
      );
      expect(context).toEqual({
        tags: { purpose: 'schedule change' },
        extra: { code: 'EMESSAGE', responseCode: 550, command: 'DATA' },
      });
      expect(close).toHaveBeenCalledOnce();
    });

    it('should not connect for no emails', async () => {
      const { sendEmails } = await loadService();

      const sent = await sendEmails([], 'schedule change');

      expect(sent).toEqual([]);
      expect(createTransport).not.toHaveBeenCalled();
    });
  });
});
