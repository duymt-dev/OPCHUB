import { randomUUID } from 'node:crypto';
import type { MailMessage, MailProvider } from './types';

/** Dev/test: giữ thư trong bộ nhớ; worker vẫn ghi `mail_logs` như thật (adapters.md) */
export class FakeMailProvider implements MailProvider {
  readonly name = 'fake';
  readonly sent: (MailMessage & { messageId: string })[] = [];

  send(msg: MailMessage): Promise<{ messageId: string }> {
    const messageId = `fake-${randomUUID()}`;
    this.sent.push({ ...msg, messageId });
    // Giữ tối đa 200 thư gần nhất để process dev không phình bộ nhớ
    if (this.sent.length > 200) this.sent.shift();
    return Promise.resolve({ messageId });
  }

  verify(): Promise<void> {
    return Promise.resolve();
  }

  /** Thư gần nhất gửi tới địa chỉ (test, endpoint dev) */
  lastTo(to: string): (MailMessage & { messageId: string }) | undefined {
    return [...this.sent].reverse().find((m) => m.to.toLowerCase() === to.toLowerCase());
  }
}
