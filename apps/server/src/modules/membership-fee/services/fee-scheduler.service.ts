import { Injectable } from '@nestjs/common';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { feeReminderLine, feeReminderMail, MailService } from '../../mail';
import { dueMilestone, REMIND_LOOKAHEAD_DAYS, REMIND_STOP_DAYS } from '../domain/fee-reminder';
import { EXPIRING_DAYS } from '../domain/membership-fee.state';
import { FeeReminderRepository } from '../repositories/fee-reminder.repository';
import { MembershipFeeRepository } from '../repositories/membership-fee.repository';

const DAY_MS = 86_400_000;
const BATCH = 500;

/**
 * Job hằng ngày 08:00 Asia/Ho_Chi_Minh (D-57): active → expiring → expired, rồi nhắc phí theo mốc
 * T-30 / T-7 / T-0 / T+3 (NA-04). Đổi trạng thái, mail và outbox ghi trong CÙNG transaction.
 */
@Injectable()
export class FeeSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fees: MembershipFeeRepository,
    private readonly reminders: FeeReminderRepository,
    private readonly mail: MailService,
    private readonly outbox: OutboxService,
  ) {}

  /** Lượt đầy đủ của job: số dòng đổi trạng thái + số mail nhắc */
  async run(now = new Date()): Promise<{ changed: number; reminded: number }> {
    const changed = await this.sweep(now);
    const reminded = await this.remind(now);
    return { changed, reminded };
  }

  async sweep(now = new Date()): Promise<number> {
    const expiringAt = new Date(now.getTime() + EXPIRING_DAYS * DAY_MS);
    return this.prisma.db.$transaction(async (tx) => {
      const changed = await this.fees.sweepStatuses(tx, now, expiringAt);
      await this.outbox.addMany(
        tx,
        'membership_fee.changed',
        changed.map((c) => ({
          userId: c.userId,
          status: c.status,
          validUntil: c.validUntil?.toISOString() ?? null,
        })),
      );
      return changed.length;
    });
  }

  /** Nhắc theo mốc, mỗi lô một transaction; lỗi lô → ném lại để BullMQ thử lại (PK chống trùng) */
  async remind(now = new Date()): Promise<number> {
    const from = new Date(now.getTime() - (REMIND_STOP_DAYS + 1) * DAY_MS);
    const to = new Date(now.getTime() + REMIND_LOOKAHEAD_DAYS * DAY_MS);
    let after = '';
    let sent = 0;
    for (;;) {
      const rows = await this.reminders.candidates(from, to, after, BATCH);
      const last = rows.at(-1);
      if (!last) return sent;
      after = last.user_id;
      const due = rows.flatMap((r) => {
        const m = dueMilestone(r.valid_until, now, new Set(r.sent), r.trial);
        return m ? [{ row: r, milestone: m }] : [];
      });
      if (due.length) {
        sent += await this.prisma.db.$transaction(async (tx) => {
          const claimed = await this.reminders.claim(
            tx,
            due.map((d) => ({
              userId: d.row.user_id,
              validUntil: d.row.valid_until,
              milestone: d.milestone,
            })),
          );
          const ok = new Set(claimed.map((c) => c.userId));
          const go = due.filter((d) => ok.has(d.row.user_id));
          await this.mail.requestMany(
            tx,
            go.map((d) => {
              const m = feeReminderMail(
                d.row.full_name,
                d.milestone,
                d.row.valid_until,
                d.row.amount,
                d.row.trial,
              );
              return {
                to: d.row.email,
                kind: 'fee_reminder' as const,
                subject: m.subject,
                html: m.html,
              };
            }),
          );
          if (go.length)
            await this.outbox.add(tx, 'membership_fee.reminded', {
              items: go.map((d) => ({
                userId: d.row.user_id,
                text: feeReminderLine(d.milestone, d.row.valid_until, d.row.trial),
              })),
            });
          return go.length;
        });
      }
      if (rows.length < BATCH) return sent;
    }
  }
}
