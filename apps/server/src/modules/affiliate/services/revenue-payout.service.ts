import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { DbTx } from '@opchub/db';
import {
  affiliateBankSchema,
  revenuePayoutSchema,
  type RevenuePayoutHistoryQuery,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { canSettleRevenueShare } from '../domain/revenue-sharing';
import { monthKey } from '../domain/month-key';
import { RevenuePayoutRepository, type PayoutRow } from '../repositories/revenue-payout.repository';
import type { AffiliateActor } from '../types';

export function payoutDto(row: PayoutRow) {
  return revenuePayoutSchema.parse({
    ...row,
    amount: row.amount.toString(),
    paidAt: row.paidAt.toISOString(),
    bank: { bankName: row.bankName, bankNo: row.bankNo, bankHolder: row.bankHolder },
  });
}

@Injectable()
export class RevenuePayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: RevenuePayoutRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly idem: IdempotencyService,
  ) {}

  record(
    actor: AffiliateActor,
    directorId: string,
    month: string,
    key: string | undefined,
    now = new Date(),
  ) {
    const scope = `revenue-payout:${directorId}:${month}`;
    return this.idem.run(scope, actor.id, key, revenuePayoutSchema, () => {
      const requestKey = createHash('sha256')
        .update(JSON.stringify([scope, actor.id, key]))
        .digest('hex');
      return this.prisma.db.$transaction(async (tx) => {
        await this.repo.lock(tx, directorId, month);
        const prior = await this.repo.receipt(tx, requestKey);
        if (prior) return payoutDto(prior);
        if (month >= monthKey(now)) throw conflict('Chỉ chi trả tháng đã kết thúc');
        return this.settle(tx, actor, directorId, month, requestKey, now);
      });
    });
  }

  private async settle(
    tx: DbTx,
    actor: AffiliateActor,
    directorId: string,
    month: string,
    requestKey: string,
    now: Date,
  ) {
    const rows = await this.repo.lockShares(tx, directorId, month);
    if (!rows.length) {
      if (!(await this.repo.knownDirector(tx, directorId)))
        throw notFound('Không có khoản chia sẻ của GĐ Vùng trong kỳ');
      throw conflict('Không còn khoản chia sẻ chưa chi trong kỳ');
    }
    const latest = rows.reduce((a, b) =>
      a.recordedAt > b.recordedAt ||
      (a.recordedAt.getTime() === b.recordedAt.getTime() && a.id > b.id)
        ? a
        : b,
    );
    // Never use the region's replacement bank. Only this beneficiary's current slot may override.
    const current = await this.repo.currentBank(tx, directorId);
    const retained = current ?? (await this.repo.retainedBank(tx, directorId));
    const bank = affiliateBankSchema.safeParse(retained ?? latest);
    if (!bank.success) throw conflict('GĐ Vùng chưa cập nhật tài khoản nhận hợp lệ');
    if (!latest.region || !latest.directorName) throw conflict('Thiếu thông tin người thụ hưởng');
    if (!canSettleRevenueShare('recorded', 'paid')) throw conflict('Không thể chi trả khoản này');
    const amount = rows.reduce((sum, row) => sum + BigInt(row.directorAmount), 0n);
    const receipt = await this.repo.create(tx, {
      requestKey,
      directorId,
      directorName: latest.directorName,
      region: latest.region,
      monthKey: month,
      amount,
      shareCount: rows.length,
      ...bank.data,
      paidBy: actor.id,
      paidAt: now,
    });
    const changed = await this.repo.settle(
      tx,
      rows.map((r) => r.id),
      receipt.id,
    );
    if (changed !== rows.length) throw conflict('Khoản chia sẻ vừa thay đổi; vui lòng tải lại');
    await this.audit.log(tx, {
      actorId: actor.id,
      ip: actor.ip,
      action: 'affiliate.revenue_payout',
      entity: 'revenue_payout',
      entityId: receipt.id,
      tag: 'affiliate',
      summary: `Chi trả GĐ Vùng ${latest.directorName} · kỳ ${month} · ${amount.toLocaleString('vi-VN')}đ`,
      diff: {
        directorId,
        monthKey: month,
        amount: amount.toString(),
        count: rows.length,
        bank: bank.data,
      },
    });
    await this.outbox.add(tx, 'affiliate.revenue_payout_recorded', { payoutId: receipt.id });
    return payoutDto(receipt);
  }

  async history(q: RevenuePayoutHistoryQuery) {
    const rows = await this.repo.history(q);
    const items = rows.slice(0, q.size).map(payoutDto);
    const last = items.at(-1);
    return {
      items,
      nextCursor: rows.length > q.size && last ? { at: last.paidAt, id: last.id } : null,
    };
  }
}
