import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '@/common/audit';
import { notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AffiliateWriteRepository } from '../repositories/affiliate-write.repository';
import type { AffiliateActor } from '../types';

@Injectable()
export class CommissionAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AffiliateWriteRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async cancel(actor: AffiliateActor, input: { ids: string[]; reason: string }, now = new Date()) {
    const ids = [...new Set(input.ids)];
    return this.prisma.db.$transaction(async (tx) => {
      const found = await this.repo.commissions(tx, ids);
      if (found.length !== ids.length) throw notFound('Không tìm thấy khoản hoa hồng');
      await this.repo.lock(tx, [...new Set(found.map((c) => c.affiliateId))]);
      const changed = await this.repo.cancel(tx, ids, input.reason, actor.id, now);
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'affiliate.commission_cancel',
        entity: 'commission',
        entityId: ids.join(','),
        tag: 'affiliate',
        summary: `Hủy ${changed.length} khoản hoa hồng`,
        diff: { ids, reason: input.reason, cancelled: changed.length },
      });
      if (changed.length)
        await this.outbox.add(tx, 'affiliate.commission_cancelled', {
          commissionIds: changed.map((c) => c.id),
          reason: input.reason,
          notificationId: randomUUID(),
        });
      return { cancelled: changed.length };
    });
  }

  /** D-110: khôi phục khoản hủy nhầm → Đã ghi nhận; audit (luật 10). Khoản đã chi trả vẫn khoá */
  async restore(actor: AffiliateActor, input: { ids: string[] }) {
    const ids = [...new Set(input.ids)];
    return this.prisma.db.$transaction(async (tx) => {
      const found = await this.repo.commissions(tx, ids);
      if (found.length !== ids.length) throw notFound('Không tìm thấy khoản hoa hồng');
      await this.repo.lock(tx, [...new Set(found.map((c) => c.affiliateId))]);
      const changed = await this.repo.restore(tx, ids);
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'affiliate.commission_restore',
        entity: 'commission',
        entityId: ids.join(','),
        tag: 'affiliate',
        summary: `Khôi phục ${changed.length} khoản hoa hồng`,
        diff: { ids, restored: changed.length },
      });
      return { restored: changed.length };
    });
  }

  async rate(actor: AffiliateActor, idsInput: string[], rate: number, now = new Date()) {
    const ids = [...new Set(idsInput)];
    return this.prisma.db.$transaction(async (tx) => {
      const found = await this.repo.lock(tx, ids);
      if (found.length !== ids.length) throw notFound('Không tìm thấy đại lý');
      await this.repo.rate(tx, ids, rate, now);
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'affiliate.rate_change',
        entity: 'affiliate',
        entityId: ids.join(','),
        tag: 'affiliate',
        summary: `Đặt tỷ lệ ${rate}% cho ${ids.length} affiliate`,
        diff: { ids, rate },
      });
      await this.outbox.add(tx, 'affiliate.rate_changed', {
        affiliateIds: ids,
        rate,
        notificationId: randomUUID(),
      });
      return { updated: ids.length };
    });
  }
}
