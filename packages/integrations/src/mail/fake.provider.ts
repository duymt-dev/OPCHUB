import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MailMessage, MailProvider } from './types';

export interface FakeMailOptions {
  /**
   * TD-035 (chỉ dev/e2e): ghi mỗi thư thành `<outDir>/<email>/<epochMs>-<messageId>.json`
   * để e2e đi theo link trong mail mà không lưu token vào DB. Production bị env schema chặn.
   */
  outDir?: string;
}

/** Tên thư mục an toàn từ email: chữ thường, ký tự ngoài `[a-z0-9._@+-]` thành `_` */
export const mailboxDirName = (email: string): string =>
  email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._@+-]/g, '_')
    .replace(/^\.+/, '_');

/** Dev/test: giữ thư trong bộ nhớ; worker vẫn ghi `mail_logs` như thật (adapters.md) */
export class FakeMailProvider implements MailProvider {
  readonly name = 'fake';
  readonly sent: (MailMessage & { messageId: string })[] = [];

  constructor(private readonly opts: FakeMailOptions = {}) {}

  async send(msg: MailMessage): Promise<{ messageId: string }> {
    const messageId = `fake-${randomUUID()}`;
    this.sent.push({ ...msg, messageId });
    // Giữ tối đa 200 thư gần nhất để process dev không phình bộ nhớ
    if (this.sent.length > 200) this.sent.shift();
    if (this.opts.outDir) await this.writeOut(msg, messageId);
    return { messageId };
  }

  verify(): Promise<void> {
    return Promise.resolve();
  }

  /** Thư gần nhất gửi tới địa chỉ (test, endpoint dev) */
  lastTo(to: string): (MailMessage & { messageId: string }) | undefined {
    return [...this.sent].reverse().find((m) => m.to.toLowerCase() === to.toLowerCase());
  }

  private async writeOut(msg: MailMessage, messageId: string): Promise<void> {
    const dir = join(this.opts.outDir ?? '', mailboxDirName(msg.to));
    await mkdir(dir, { recursive: true });
    const sentAt = new Date();
    const body = { to: msg.to, subject: msg.subject, html: msg.html, sentAt: sentAt.toISOString() };
    await writeFile(join(dir, `${sentAt.getTime()}-${messageId}.json`), JSON.stringify(body));
  }
}
