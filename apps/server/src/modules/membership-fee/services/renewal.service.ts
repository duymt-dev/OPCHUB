import { Injectable } from '@nestjs/common';
import {
  DEFAULT_RENEWAL,
  renewalSettingsSchema,
  type RenewalSettingsPatch,
  type RenewalQuery,
  type RenewalSend,
  type RenewalSendResult,
} from '@opchub/shared/api-domains';
import { nextRenewalMilestone, renewalDaysLeft } from '@opchub/shared';
import { AuditService } from '@/common/audit';
import { AppError } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppSettingsService } from '../../settings';
import {
  RenewalRepository,
  renewalWindow,
  type RenewalCursor,
} from '../repositories/renewal.repository';
import { RenewalDeliveryService } from './renewal-delivery.service';
type Actor = { id: string; ip: string | null };
@Injectable()
export class RenewalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: RenewalRepository,
    private readonly settings: AppSettingsService,
    private readonly delivery: RenewalDeliveryService,
    private readonly audit: AuditService,
  ) {}
  config() {
    return this.settings.renewal();
  }
  async patch(actor: Actor, patch: RenewalSettingsPatch) {
    const next = await this.prisma.db.$transaction(async (tx) => {
      // Serialize concurrent nested partial patches; cache is never the write source.
      const before = renewalSettingsSchema.parse(await this.repo.lockSettings(tx));
      const after = renewalSettingsSchema.parse({
        milestones: { ...before.milestones, ...patch.milestones },
        channels: { ...before.channels, ...patch.channels },
      });
      await tx.appSetting.update({ where: { key: 'renewal' }, data: { value: after } });
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'settings.renewal',
        entity: 'settings',
        entityId: 'renewal',
        tag: 'settings',
        summary: 'Cập nhật nhắc gia hạn',
        diff: { before, after },
      });
      return after;
    });
    await this.settings.invalidate('renewal');
    return next;
  }
  async list(q: RenewalQuery, now = new Date()) {
    const config = await this.config();
    const { from, to } = renewalWindow(now);
    const [total, rows] = await Promise.all([
      this.repo.count(now),
      this.repo.rows(from, to, q.cursor, q.limit + 1),
    ]);
    const items = rows.slice(0, q.limit).map((r) => ({
      userId: r.user_id,
      name: r.full_name,
      email: r.email,
      plan: r.plan,
      validUntil: r.valid_until.toISOString(),
      daysLeft: renewalDaysLeft(r.valid_until, now),
      nextMilestone: nextRenewalMilestone(renewalDaysLeft(r.valid_until, now), config.milestones),
      lastSentAt: r.last_sent_at?.toISOString() ?? null,
    }));
    const last = items.at(-1);
    return {
      total,
      items,
      nextCursor:
        rows.length > q.limit && last
          ? JSON.stringify({ validUntil: last.validUntil, userId: last.userId })
          : null,
    };
  }
  async send(actor: Actor, body: RenewalSend, now = new Date()): Promise<RenewalSendResult> {
    const config = await this.config();
    const channels: RenewalSendResult['channels'] = [];
    if (config.channels.email) channels.push('email');
    if (config.channels.app) channels.push('app');
    if (!channels.length) throw new AppError('RENEWAL_NO_CHANNEL', 'Bật ít nhất 1 kênh gửi');
    const { from, to } = renewalWindow(now);
    return this.prisma.db.$transaction(async (tx) => {
      let cursor: RenewalCursor | undefined;
      let sent = 0;
      const milestones: Record<string, number> = {};
      // Explicit all-send bounded batches, all claims + mail + outbox + audit share this transaction.
      for (;;) {
        const rows = await this.repo.rows(
          from,
          to,
          cursor,
          500,
          'userIds' in body ? body.userIds : undefined,
          tx,
        );
        const last = rows.at(-1);
        if (!last) break;
        const items = rows.map((row) => {
          const milestone = nextRenewalMilestone(
            renewalDaysLeft(row.valid_until, now),
            DEFAULT_RENEWAL.milestones,
          );
          if (!milestone) throw new Error('Renewal candidate outside reminder window');
          milestones[milestone] = (milestones[milestone] ?? 0) + 1;
          return { row, milestone };
        });
        await this.repo.recordManual(tx, rows, now);
        await this.delivery.deliver(tx, items, config.channels, now);
        sent += rows.length;
        if (rows.length < 500 || 'userIds' in body) break;
        cursor = { validUntil: last.valid_until.toISOString(), userId: last.user_id };
      }
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'fee.renewal_send',
        entity: 'membership_fee',
        entityId: 'renewal',
        tag: 'member',
        summary: `Gửi nhắc gia hạn tới ${sent} thành viên`,
        diff: { sent, channels, milestones },
      });
      return { sent, channels };
    });
  }
}
