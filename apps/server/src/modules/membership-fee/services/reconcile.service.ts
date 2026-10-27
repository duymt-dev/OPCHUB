import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { type BankTxn, type BankWebhookProvider, parsePaymentContent } from '@opchub/integrations';
import { QUEUES } from '@opchub/shared/queues';
import { BANK } from '@/common/integrations';
import { AppError, unauthorized } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QueueService } from '@/common/queue';
import { MemberDirectory } from '../../account';
import {
  FUNDRAISING_PAYMENT_PORT,
  type FundraisingPayer,
  type FundraisingPaymentPort,
} from '../ports';
import { PaymentTransactionRepository } from '../repositories/payment-transaction.repository';
import { MembershipFeeService } from './membership-fee.service';

export type MatchOutcome =
  | { matched: true; userId: string; validUntil: Date }
  | { matched: true; userId: string; fundraising: true }
  | { matched: false; reason: string };

/** Quét bù: lấy giao dịch 10 phút gần nhất mỗi 2 phút (chồng lấn để không sót) */
const POLL_LOOKBACK_MS = 10 * 60_000;

/**
 * Đối soát CK (D-07, D-41): webhook / quét bù → lưu idempotent → khớp Mã TV + đủ tiền →
 * kích hoạt trong một transaction. Không khớp → để `unmatched` cho Admin (B15).
 */
@Injectable()
export class ReconcileService {
  private readonly logger = new Logger(ReconcileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly txns: PaymentTransactionRepository,
    private readonly members: MemberDirectory,
    private readonly fees: MembershipFeeService,
    private readonly queue: QueueService,
    @Inject(BANK) private readonly bank: BankWebhookProvider,
    @Optional()
    @Inject(FUNDRAISING_PAYMENT_PORT)
    private readonly fundraising: FundraisingPaymentPort | null = null,
  ) {}

  /** Webhook: kiểm HMAC trên raw body, lưu giao dịch, đẩy job khớp. Trả số giao dịch nhận */
  async ingestWebhook(
    rawBody: Buffer | undefined,
    headers: Record<string, string | undefined>,
  ): Promise<number> {
    if (!rawBody || !this.bank.verify(rawBody, headers)) {
      throw unauthorized('Chữ ký webhook không hợp lệ');
    }
    let list: BankTxn[];
    try {
      list = this.bank.parse(rawBody);
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Webhook không hợp lệ');
    }
    for (const t of list) await this.store(t);
    return list.length;
  }

  /** Quét bù 2 phút (job `reconcile.poll`) — trùng webhook thì ON CONFLICT bỏ qua */
  async poll(now = new Date()): Promise<number> {
    const list = await this.bank.listSince(new Date(now.getTime() - POLL_LOOKBACK_MS));
    for (const t of list) await this.store(t);
    return list.length;
  }

  private async store(t: BankTxn): Promise<void> {
    const id = await this.txns.upsert(this.bank.name, t);
    // jobId cố định: webhook + poll cùng giao dịch → một job
    await this.queue.add(
      QUEUES.reconcile,
      'match',
      { transactionId: id },
      { jobId: `match-${id}` },
    );
  }

  /** Job `reconcile.match` — idempotent: giao dịch đã khớp thì bỏ qua */
  async match(transactionId: string, now = new Date()): Promise<MatchOutcome> {
    const head = await this.prisma.db.paymentTransaction.findUnique({
      where: { id: transactionId },
      select: { content: true, matchStatus: true },
    });
    if (!head || head.matchStatus !== 'unmatched') return { matched: false, reason: 'handled' };
    // D-104 §28.1: chỉ tự khớp nội dung đúng mẫu `OPCHUB [Mã TV] [SĐT] [GV?]`
    const parsed = parsePaymentContent(head.content);
    // D-105: có GV → Gói Gọi vốn, Mã TV phải đúng chủ khoản
    if (parsed.kind === 'fundraising') {
      const payer = await this.members.byMemberCode(parsed.memberCode);
      const who = { memberCode: parsed.memberCode, id: payer?.id ?? null };
      return this.settle(transactionId, (tx) =>
        this.matchFundraising(tx, transactionId, parsed.code, who, now),
      );
    }
    const code = parsed.kind === 'member' ? parsed.code : null;
    const member = code ? await this.members.byMemberCode(code) : null;

    return this.settle(transactionId, async (tx) => {
      const t = await this.txns.findUnmatched(tx, transactionId);
      if (!t) return { matched: false, reason: 'handled' } as const;
      const reason =
        parsed.kind === 'invalid'
          ? parsed.reason
          : !member
            ? `Không có thành viên ${code}`
            : member.accountType === 'investor'
              ? 'Nhà đầu tư không đóng phí'
              : null;
      if (reason || !member) {
        await this.txns.noteUnmatched(tx, t.id, reason ?? 'Không khớp');
        return { matched: false, reason: reason ?? 'Không khớp' } as const;
      }
      // Khoá giao dịch trước (chỉ khớp một lần), rồi kích hoạt — cùng transaction
      if (!(await this.txns.markMatched(tx, t.id, member.id, now))) {
        return { matched: false, reason: 'handled' } as const;
      }
      const validUntil = await this.fees.activate(
        tx,
        { userId: member.id, amount: t.amount, source: 'transfer', paymentTransactionId: t.id },
        now,
      );
      return { matched: true, userId: member.id, validUntil } as const;
    });
  }

  /** Khoá giao dịch + chuyển Gói Gọi vốn sang chờ thẩm định trong cùng transaction */
  private async matchFundraising(
    tx: DbTx,
    transactionId: string,
    code: string,
    payer: FundraisingPayer | null,
    now: Date,
  ): Promise<MatchOutcome> {
    const t = await this.txns.findUnmatched(tx, transactionId);
    if (!t) return { matched: false, reason: 'handled' };
    const r = this.fundraising
      ? await this.fundraising.pay(tx, { code, amount: t.amount, transactionId: t.id, payer }, now)
      : { reason: 'Chưa hỗ trợ đối soát Gói Gọi vốn' };
    if ('reason' in r) {
      await this.txns.noteUnmatched(tx, t.id, r.reason);
      return { matched: false, reason: r.reason };
    }
    if (!(await this.txns.markMatched(tx, t.id, r.ownerId, now))) throw new HandledError();
    return { matched: true, userId: r.ownerId, fundraising: true };
  }

  /**
   * Một transaction khớp; `AppError` (thiếu tiền / sai trạng thái) → rollback rồi ghi chú lý do ở
   * transaction riêng, giao dịch giữ `unmatched` cho Admin.
   */
  private settle(
    transactionId: string,
    run: (tx: DbTx) => Promise<MatchOutcome>,
  ): Promise<MatchOutcome> {
    return this.prisma.db
      .$transaction(async (tx) => {
        try {
          return await run(tx);
        } catch (err) {
          if (!(err instanceof AppError)) throw err;
          throw new UnmatchedError(err.message);
        }
      })
      .catch(async (err: unknown) => {
        if (err instanceof HandledError) return { matched: false, reason: 'handled' } as const;
        if (!(err instanceof UnmatchedError)) throw err;
        await this.prisma.db.$transaction((tx) =>
          this.txns.noteUnmatched(tx, transactionId, err.message),
        );
        this.logger.log({ transactionId, reason: err.message }, 'Giao dịch không khớp');
        return { matched: false, reason: err.message };
      });
  }
}

class UnmatchedError extends Error {}
/** Giao dịch đã được khớp bởi luồng khác → rollback, không ghi chú */
class HandledError extends Error {}
