import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { createHash } from 'node:crypto';
import { payoutMonthOf } from '@opchub/shared';
import {
  regionalBankSchema,
  regionalPayoutResultSchema,
  type RegionalRegion,
} from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import { AuditService } from '@/common/audit';
import { OutboxService } from '@/common/outbox';
import { conflict } from '@/common/errors';
import { RegionalProjectionRepository } from '@/modules/reporting';
import { RegionalPayoutRepository } from '../repositories/regional-payout.repository';
import { RegionalValidationError } from '../domain/regional-director.rules';
import type { RegionalActor } from './regional-director.service';

@Injectable()
export class RegionalPayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: RegionalPayoutRepository,
    private readonly idem: IdempotencyService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly projection: RegionalProjectionRepository,
  ) {}

  record(
    actor: RegionalActor,
    region: RegionalRegion,
    userId: string,
    key: string | undefined,
    now = new Date(),
  ) {
    if (!key || key.length > 200) throw new RegionalValidationError('Thiếu header Idempotency-Key');
    const scope = `regional-payout:${region}:${userId}`;
    const id = createHash('sha256').update(`${scope}:${actor.id}:${key}`).digest('hex');
    return this.idem.run(scope, actor.id, key, regionalPayoutResultSchema, () =>
      this.prisma.db.$transaction((tx) => this.recordWithin(tx, actor, region, userId, id, now)),
    );
  }
  private async recordWithin(
    tx: DbTx,
    actor: RegionalActor,
    region: RegionalRegion,
    userId: string,
    id: string,
    now: Date,
  ) {
    const owner = await this.projection.member(tx, userId);
    const directorName = owner?.fullName ?? userId;
    const prior = await this.repo.receipt(tx, id);
    if (prior) {
      const { bankSnapshot, ...receipt } = prior;
      return {
        ...receipt,
        directorName,
        bankHolder: regionalBankSchema.parse(bankSnapshot).bankHolder,
      };
    }
    const bank = await this.repo.bank(tx, region, userId);
    const pending = await this.repo.pending(tx, region, userId, payoutMonthOf(now));
    const amount = pending.reduce((sum, row) => sum + row.directorAmount, 0);
    if (!Number.isSafeInteger(amount))
      throw new RegionalValidationError('Tổng chi vượt giới hạn số nguyên an toàn');
    if (!pending.length || !amount) throw conflict('Không có khoản chờ chi');
    if (!bank) throw conflict(`${directorName} chưa cập nhật tài khoản nhận`);
    const monthKeys = [...new Set(pending.map((row) => row.monthKey))].sort();
    await this.repo.create(tx, {
      id,
      region,
      directorUserId: userId,
      monthKeys,
      amount,
      count: pending.length,
      bankSnapshot: bank,
      paidBy: actor.id,
      paidAt: now,
    });
    if (
      (await this.repo.markPaid(
        tx,
        pending.map((row) => row.id),
        id,
      )) !== pending.length
    )
      throw conflict('Khoản chi vừa được cập nhật');
    await this.audit.log(tx, {
      actorId: actor.id,
      ip: actor.ip,
      action: 'regional_share.payout',
      entity: 'regional_payout',
      entityId: id,
      tag: 'affiliate',
      summary: `Chi trả ${amount.toLocaleString('vi-VN')}đ cho GĐ Vùng ${directorName} · ${monthKeys.join(', ')}`,
      diff: {
        amount,
        count: pending.length,
        monthKeys,
        directorUserId: userId,
        bankLast4: bank.bankNo.replaceAll(' ', '').slice(-4),
      },
    });
    await this.outbox.add(tx, 'regional_share.payout_recorded', {
      payoutId: id,
      region,
      directorUserId: userId,
    });
    return {
      id,
      amount,
      count: pending.length,
      monthKeys,
      directorUserId: userId,
      directorName,
      bankHolder: bank.bankHolder,
    };
  }
}
