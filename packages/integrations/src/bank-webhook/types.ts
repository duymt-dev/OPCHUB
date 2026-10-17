import { z } from 'zod';

/** Giao dịch tiền vào đã chuẩn hoá — mọi provider trả cùng dạng */
export const bankTxnSchema = z.object({
  /** Id giao dịch duy nhất phía ngân hàng/provider — UQ (provider, bank_txn_id) */
  bankTxnId: z.string().min(1),
  /** VND, số nguyên dương */
  amount: z.number().int().positive(),
  content: z.string(),
  receivedAt: z.date(),
  raw: z.record(z.string(), z.unknown()),
});
export type BankTxn = z.infer<typeof bankTxnSchema>;

export interface BankWebhookProvider {
  readonly name: string;
  /** Kiểm chữ ký trên raw body; không ném — sai trả false */
  verify(rawBody: Buffer, headers: Record<string, string | undefined>): boolean;
  /** Parse body webhook → giao dịch tiền vào (bỏ giao dịch tiền ra) */
  parse(rawBody: Buffer): BankTxn[];
  /** Quét bù 2 phút (đề phòng mất webhook) */
  listSince(since: Date): Promise<BankTxn[]>;
}
