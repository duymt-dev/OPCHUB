import { z } from 'zod';
import { IntegrationError } from '../errors';
import { fetchJson } from '../http';
import { verifySignature } from './signature';
import type { BankTxn, BankWebhookProvider } from './types';

/** Payload webhook SePay (D-07) — chỉ lấy trường cần, phần còn lại giữ trong `raw` */
const sepayTxnSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    transferType: z.enum(['in', 'out']),
    transferAmount: z.number().int(),
    content: z.string().default(''),
    transactionDate: z.string(),
  })
  .passthrough();

const listSchema = z.object({ transactions: z.array(sepayTxnSchema).default([]) }).passthrough();

export interface SepayConfig {
  webhookSecret: string;
  apiToken: string;
  apiBase?: string;
  accountNumber: string;
}

/** `transactionDate` SePay theo giờ VN, không kèm múi giờ */
const vnDate = (s: string) => new Date(`${s.replace(' ', 'T')}+07:00`);

function toTxn(t: z.infer<typeof sepayTxnSchema>): BankTxn | null {
  if (t.transferType !== 'in' || t.transferAmount <= 0) return null;
  return {
    bankTxnId: String(t.id),
    amount: t.transferAmount,
    content: t.content,
    receivedAt: vnDate(t.transactionDate),
    raw: t,
  };
}

/** TODO(OQ-06): xác nhận header chữ ký + endpoint API khi Chủ nhà cấp tài khoản SePay */
export class SepayBankProvider implements BankWebhookProvider {
  readonly name = 'sepay';

  constructor(private readonly cfg: SepayConfig) {}

  verify(rawBody: Buffer, headers: Record<string, string | undefined>): boolean {
    return verifySignature(this.cfg.webhookSecret, rawBody, headers['x-sepay-signature']);
  }

  parse(rawBody: Buffer): BankTxn[] {
    const parsed = sepayTxnSchema.safeParse(JSON.parse(rawBody.toString('utf8')));
    if (!parsed.success) throw new IntegrationError(this.name, 'Webhook không hợp lệ', false);
    const t = toTxn(parsed.data);
    return t ? [t] : [];
  }

  async listSince(since: Date): Promise<BankTxn[]> {
    const base = this.cfg.apiBase ?? 'https://my.sepay.vn/userapi';
    const qs = new URLSearchParams({
      account_number: this.cfg.accountNumber,
      transaction_date_min: since.toISOString().slice(0, 19).replace('T', ' '),
    });
    const data = await fetchJson(`${base}/transactions/list?${qs.toString()}`, listSchema, {
      provider: this.name,
      init: { headers: { Authorization: `Bearer ${this.cfg.apiToken}` } },
    });
    return data.transactions.map(toTxn).filter((t): t is BankTxn => t !== null);
  }
}
