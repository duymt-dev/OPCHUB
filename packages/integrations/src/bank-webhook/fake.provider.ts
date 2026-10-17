import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { IntegrationError } from '../errors';
import { signBody, verifySignature } from './signature';
import type { BankTxn, BankWebhookProvider } from './types';

/** Body webhook giả — cũng là body của `POST /v1/dev/bank/simulate` */
export const fakeBankBodySchema = z.object({
  id: z
    .string()
    .min(1)
    .default(() => `fake-${randomUUID()}`),
  amount: z.number().int().positive(),
  content: z.string(),
  receivedAt: z.iso.datetime().optional(),
});
export type FakeBankBody = z.input<typeof fakeBankBodySchema>;

const SIG_HEADER = 'x-fake-signature';

/**
 * FakeBank (adapters.md): giao dịch giả trong bộ nhớ, ký HMAC như thật để đi đúng đường webhook.
 * `listSince` trả các giao dịch đã `push` — mô phỏng quét bù 2 phút.
 */
export class FakeBankProvider implements BankWebhookProvider {
  readonly name = 'fake';
  private readonly txns: BankTxn[] = [];

  constructor(private readonly secret: string) {}

  /** Tạo body + header đã ký để gọi webhook như ngân hàng thật */
  sign(body: FakeBankBody): { rawBody: string; headers: Record<string, string> } {
    const rawBody = JSON.stringify(fakeBankBodySchema.parse(body));
    return { rawBody, headers: { [SIG_HEADER]: signBody(this.secret, rawBody) } };
  }

  /** Ghi nhận giao dịch phía "ngân hàng" (để poll thấy cả khi webhook không về) */
  push(body: FakeBankBody): BankTxn {
    const b = fakeBankBodySchema.parse(body);
    const t: BankTxn = {
      bankTxnId: b.id,
      amount: b.amount,
      content: b.content,
      receivedAt: b.receivedAt ? new Date(b.receivedAt) : new Date(),
      raw: { ...b },
    };
    this.txns.push(t);
    return t;
  }

  verify(rawBody: Buffer, headers: Record<string, string | undefined>): boolean {
    return verifySignature(this.secret, rawBody, headers[SIG_HEADER]);
  }

  parse(rawBody: Buffer): BankTxn[] {
    const parsed = fakeBankBodySchema.safeParse(JSON.parse(rawBody.toString('utf8')));
    if (!parsed.success) throw new IntegrationError(this.name, 'Webhook không hợp lệ', false);
    const b = parsed.data;
    return [
      {
        bankTxnId: b.id,
        amount: b.amount,
        content: b.content,
        receivedAt: b.receivedAt ? new Date(b.receivedAt) : new Date(),
        raw: { ...b },
      },
    ];
  }

  listSince(since: Date): Promise<BankTxn[]> {
    return Promise.resolve(this.txns.filter((t) => t.receivedAt >= since));
  }
}
