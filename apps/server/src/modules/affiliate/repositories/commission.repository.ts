import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { canReferral } from '../domain/affiliate.state';

export interface PendingReferral {
  id: string;
  affiliateId: string;
  affiliateCode: string;
  rate: number;
  affiliateStatus: 'active' | 'paused';
  affiliateUserId: string;
}

/** Bảng `referrals` + `commissions` (AF-R03 → R06) */
@Injectable()
export class CommissionRepository {
  /** Referral `pending` của người vừa đóng phí + đại lý (1 query, khoá dòng referral) */
  async pendingReferral(tx: DbTx, referredUserId: string): Promise<PendingReferral | null> {
    const rows = await tx.$queryRaw<PendingReferral[]>`
      SELECT r.id, r.affiliate_id AS "affiliateId", r.affiliate_code AS "affiliateCode",
             a.rate, a.status::text AS "affiliateStatus", a.user_id AS "affiliateUserId"
      FROM referrals r JOIN affiliates a ON a.id = r.affiliate_id
      WHERE r.referred_user_id = ${referredUserId} AND r.status = 'pending'
      FOR UPDATE OF a,r`;
    return rows[0] ?? null;
  }

  /** AF-R03: gắn lúc kích hoạt TK, cùng tx tạo user; một người một referral */
  async addReferral(
    tx: DbTx,
    row: { affiliateId: string; affiliateCode: string; referredUserId: string; monthKey: string },
  ): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO referrals (id, affiliate_id, affiliate_code, referred_user_id, status, month_key)
      VALUES (gen_random_uuid()::text, ${row.affiliateId}, ${row.affiliateCode},
              ${row.referredUserId}, 'pending', ${row.monthKey})
      ON CONFLICT (referred_user_id) DO NOTHING`;
  }

  /** Luật 7: pending → converted | void có điều kiện */
  async closeReferral(tx: DbTx, id: string, to: 'converted' | 'void', at: Date): Promise<boolean> {
    if (!canReferral('pending', to)) return false;
    const r = await tx.referral.updateMany({
      where: { id, status: 'pending' },
      data: { status: to, ...(to === 'converted' ? { convertedAt: at } : {}) },
    });
    return r.count > 0;
  }

  /** UQ referred_user_id + fee_period_id: chạy lại không ghi khoản thứ hai */
  async record(
    tx: DbTx,
    row: {
      affiliateId: string;
      referredUserId: string;
      feePeriodId: string;
      listAmount: number;
      amount: number;
      rate: number;
      monthKey: string;
    },
  ): Promise<string | null> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO commissions (id, affiliate_id, referred_user_id, fee_period_id, list_amount,
                               amount, rate, status, month_key)
      VALUES (gen_random_uuid()::text, ${row.affiliateId}, ${row.referredUserId}, ${row.feePeriodId},
              ${row.listAmount}, ${row.amount}, ${row.rate}, 'recorded', ${row.monthKey})
      ON CONFLICT DO NOTHING
      RETURNING id`;
    return rows[0]?.id ?? null;
  }

  /** AF-R06: bảng của Affiliate; tên khách đọc qua Account.MemberDirectory. */
  async forNotice(
    id: string,
    tx: DbTx,
  ): Promise<{ userId: string; code: string; amount: number; customerId: string } | null> {
    const rows = await tx.$queryRaw<
      { userId: string; code: string; amount: number; customerId: string }[]
    >`
      SELECT a.user_id AS "userId", a.code, c.amount, c.referred_user_id AS "customerId"
      FROM commissions c
      JOIN affiliates a ON a.id = c.affiliate_id
      WHERE c.id = ${id}`;
    return rows[0] ?? null;
  }
}
