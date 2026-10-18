import { createTransport, type Transporter } from 'nodemailer';
import { IntegrationError } from '../errors';
import type { MailMessage, MailProvider, SmtpConfig } from './types';

/** Brevo SMTP relay hoặc SMTP bất kỳ (D-13) */
export class SmtpMailProvider implements MailProvider {
  readonly name = 'smtp';
  private readonly transport: Transporter;

  constructor(private readonly cfg: SmtpConfig) {
    this.transport = createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.encryption === 'ssl',
      requireTLS: cfg.encryption === 'tls',
      auth: { user: cfg.username, pass: cfg.password },
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
    });
  }

  async send(msg: MailMessage): Promise<{ messageId: string }> {
    const from = msg.from ?? { name: this.cfg.fromName, email: this.cfg.fromEmail };
    try {
      const info = await this.transport.sendMail({
        from: `"${from.name}" <${from.email}>`,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
        ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
        ...(msg.attachments ? { attachments: msg.attachments } : {}),
        ...(msg.headers ? { headers: msg.headers } : {}),
      });
      return { messageId: String(info.messageId) };
    } catch (err) {
      throw new IntegrationError(this.name, 'Gửi mail thất bại', true, { cause: err });
    }
  }

  async verify(): Promise<void> {
    try {
      await this.transport.verify();
    } catch (err) {
      throw new IntegrationError(this.name, 'Không kết nối được máy chủ SMTP', false, {
        cause: err,
      });
    }
  }
}
