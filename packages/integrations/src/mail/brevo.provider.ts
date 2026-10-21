import { IntegrationError } from '../errors';
import type { MailMessage, MailProvider } from './types';

export interface BrevoMailOptions {
  apiKey: string;
  defaultFrom?: { name: string; email: string };
  fetchImpl?: typeof fetch;
}

/**
 * Adapter gửi email qua Brevo REST API v3 (D-13).
 * POST https://api.brevo.com/v3/smtp/email
 */
export class BrevoMailProvider implements MailProvider {
  readonly name = 'brevo';
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: BrevoMailOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async send(msg: MailMessage): Promise<{ messageId: string }> {
    const from = msg.from ??
      this.opts.defaultFrom ?? { name: 'OPC Hub', email: 'no-reply@opchub.community' };
    try {
      const res = await this.fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.opts.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: from.name, email: from.email },
          to: [{ email: msg.to }],
          subject: msg.subject,
          htmlContent: msg.html,
          ...(msg.text ? { textContent: msg.text } : {}),
          ...(msg.replyTo ? { replyTo: { email: msg.replyTo } } : {}),
          ...(msg.headers ? { headers: msg.headers } : {}),
          ...(msg.attachments?.length
            ? {
                attachment: msg.attachments.map((a) => {
                  if (a.path) return { url: a.path, name: a.filename };
                  const content = a.content ? Buffer.from(a.content).toString('base64') : '';
                  return { content, name: a.filename };
                }),
              }
            : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new IntegrationError(
          this.name,
          `Gửi mail qua Brevo API thất bại: ${errorText}`,
          true,
        );
      }

      const data = (await res.json().catch(() => ({}))) as { messageId?: string };
      return { messageId: data.messageId ?? `brevo-${Date.now()}` };
    } catch (err) {
      if (err instanceof IntegrationError) throw err;
      throw new IntegrationError(this.name, 'Gửi mail qua Brevo API thất bại', true, {
        cause: err,
      });
    }
  }

  async verify(): Promise<void> {
    try {
      const res = await this.fetchImpl('https://api.brevo.com/v3/account', {
        headers: { 'api-key': this.opts.apiKey },
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) {
        throw new IntegrationError(this.name, 'Không xác thực được tài khoản Brevo', false);
      }
    } catch (err) {
      if (err instanceof IntegrationError) throw err;
      throw new IntegrationError(this.name, 'Không kết nối được tới Brevo API', false, {
        cause: err,
      });
    }
  }
}
