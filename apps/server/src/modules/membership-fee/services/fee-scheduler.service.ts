import { Injectable, Logger } from '@nestjs/common';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppSettingsService } from '../../settings';
import { dueMilestone } from '../domain/fee-reminder';
import { EXPIRING_DAYS } from '../domain/membership-fee.state';
import { FeeReminderRepository } from '../repositories/fee-reminder.repository';
import { MembershipFeeRepository } from '../repositories/membership-fee.repository';
import { renewalWindow, type RenewalCursor } from '../repositories/renewal.repository';
import { RenewalDeliveryService } from './renewal-delivery.service';
const BATCH = 500;
/** Existing 08:00 VN job; state sweep unchanged, new BR-471 D30 / D7 / D1 policy. */
@Injectable()
export class FeeSchedulerService {
  private readonly logger = new Logger(FeeSchedulerService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly fees: MembershipFeeRepository,
    private readonly reminders: FeeReminderRepository,
    private readonly delivery: RenewalDeliveryService,
    private readonly outbox: OutboxService,
    private readonly settings: AppSettingsService,
  ) {}
  async run(now = new Date()): Promise<{ changed: number; reminded: number }> {
    const changed = await this.sweep(now);
    return { changed, reminded: await this.remind(now) };
  }
  async sweep(now = new Date()): Promise<number> {
    const expiringAt = new Date(now.getTime() + EXPIRING_DAYS * 86_400_000);
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
  async remind(now = new Date()): Promise<number> {
    const config = await this.settings.renewal();
    if (!config.channels.email && !config.channels.app) {
      this.logger.log('Renewal channels disabled; milestones not claimed');
      return 0;
    }
    if (!Object.values(config.milestones).some(Boolean)) return 0;
    const { from, to } = renewalWindow(now);
    let cursor: RenewalCursor | undefined;
    let sent = 0;
    // Bounded keyset batch loop mandated by BR-472; no per-recipient queries.
    for (;;) {
      const rows = await this.reminders.candidates(from, to, cursor, BATCH);
      const last = rows.at(-1);
      if (!last) return sent;
      cursor = { validUntil: last.valid_until.toISOString(), userId: last.user_id };
      const due = rows.flatMap((row) => {
        const milestone = dueMilestone(row.valid_until, now, new Set(row.sent), config.milestones);
        return milestone ? [{ row, milestone }] : [];
      });
      if (due.length)
        sent += await this.prisma.db.$transaction(async (tx) => {
          const claimed = await this.reminders.claim(
            tx,
            due.map((d) => ({
              userId: d.row.user_id,
              validUntil: d.row.valid_until,
              milestone: d.milestone,
            })),
          );
          const ids = new Set(claimed.map((c) => c.userId));
          const go = due.filter((d) => ids.has(d.row.user_id));
          await this.delivery.deliver(tx, go, config.channels, now);
          return go.length;
        });
      if (rows.length < BATCH) return sent;
    }
  }
}
