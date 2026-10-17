import { Inject, Injectable, Logger } from '@nestjs/common';
import { type BankTxn, type BankWebhookProvider, extractMemberCode } from '@opchub/integrations';
import { QUEUES } from '@opchub/shared/queues';
import { BANK } from '@/common/integrations';
import { AppError, unauthorized } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QueueService } from '@/common/queue';
import { MemberDirectory } from '../../account';
import { PaymentTransactionRepository } from '../repositories/payment-transaction.repository';
import { MembershipFeeService } from './membership-fee.service';

export type MatchOutcome =
  { matched: true; userId: string; validUntil: Date } | { matched: false; reason: string };

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
    const code = extractMemberCode(head.content);
    const member = code ? await this.members.byMemberCode(code) : null;

    return this.prisma.db
      .$transaction(async (tx) => {
        const t = await this.txns.findUnmatched(tx, transactionId);
        if (!t) return { matched: false, reason: 'handled' } as const;
        const reason = !code
          ? 'Không tìm thấy Mã TV trong nội dung'
          : !member
            ? `Không có thành viên ${code}`
            : member.accountType === 'investor'
              ? 'Nhà đầu tư không đóng phí'
              : null;
        if (reason || !member) {
          await this.txns.noteUnmatched(tx, t.id, reason ?? 'Không khớp');
          return { matched: false, reason: reason ?? 'Không khớp' } as const;
        }
        try {
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
        } catch (err) {
          if (!(err instanceof AppError)) throw err;
          // Thiếu tiền / trạng thái không hợp lệ → rollback rồi ghi chú ở transaction riêng
          throw new UnmatchedError(err.message);
        }
      })
      .catch(async (err: unknown) => {
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
