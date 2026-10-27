import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { canReferral } from '../domain/affiliate.state';

export interface PendingReferral {
  id: string;
  affiliateId: string;
  affiliateCode: string;
  rate: number;
  affiliateUserId: string;
}

export interface CommissionNotice {
  userId: string;
  code: string;
  amount: number;
  customerId: string;
  source: 'membership' | 'fundraising';
  listAmount: number;
}

/** Bảng `referrals` + `commissions` (AF-R03 → R06) */
@Injectable()
export class CommissionRepository {
  /** Referral `pending` của người vừa đóng phí + đại lý (1 query, khoá dòng referral) */
  async pendingReferral(tx: DbTx, referredUserId: string): Promise<PendingReferral | null> {
    const rows = await tx.$queryRaw<PendingReferral[]>`
      SELECT r.id, r.affiliate_id AS "affiliateId", r.affiliate_code AS "affiliateCode",
             a.rate, a.user_id AS "affiliateUserId"
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

  /** Luật 7: pending → converted có điều kiện (D-110: không còn void) */
  async closeReferral(tx: DbTx, id: string, to: 'converted', at: Date): Promise<boolean> {
    if (!canReferral('pending', to)) return false;
    const r = await tx.referral.updateMany({
      where: { id, status: 'pending' },
      data: { status: to, convertedAt: at },
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
      plan: 'personal' | 'business';
      amount: number;
      rate: number;
      monthKey: string;
    },
  ): Promise<string | null> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO commissions (id, affiliate_id, referred_user_id, fee_period_id, list_amount, plan,
                               amount, rate, status, month_key)
      VALUES (gen_random_uuid()::text, ${row.affiliateId}, ${row.referredUserId}, ${row.feePeriodId},
              ${row.listAmount}, ${row.plan}::commission_plan, ${row.amount}, ${row.rate}, 'recorded',
              ${row.monthKey})
      ON CONFLICT DO NOTHING
      RETURNING id`;
    return rows[0]?.id ?? null;
  }

  /**
   * D-70 (V4-610): đại lý giới thiệu chủ dự án — referral còn hiệu lực (pending | converted, không
   * void) + đại lý; khoá dòng đại lý để đổi trạng thái song song không lệch.
   */
  async referrerOf(tx: DbTx, referredUserId: string): Promise<PendingReferral | null> {
    const rows = await tx.$queryRaw<PendingReferral[]>`
      SELECT r.id, r.affiliate_id AS "affiliateId", r.affiliate_code AS "affiliateCode",
             a.rate, a.user_id AS "affiliateUserId"
      FROM referrals r JOIN affiliates a ON a.id = r.affiliate_id
      WHERE r.referred_user_id = ${referredUserId} AND r.status IN ('pending', 'converted')
      FOR UPDATE OF a`;
    return rows[0] ?? null;
  }

  /** UQ fundraising_id: chạy lại không ghi khoản thứ hai */
  async recordFundraising(
    tx: DbTx,
    row: {
      affiliateId: string;
      referredUserId: string;
      fundraisingId: string;
      listAmount: number;
      amount: number;
      rate: number;
      monthKey: string;
    },
  ): Promise<string | null> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO commissions (id, affiliate_id, referred_user_id, fundraising_id, source, plan,
                               list_amount, amount, rate, status, month_key)
      VALUES (gen_random_uuid()::text, ${row.affiliateId}, ${row.referredUserId},
              ${row.fundraisingId}, 'fundraising', 'fundraising', ${row.listAmount}, ${row.amount},
              ${row.rate}, 'recorded', ${row.monthKey})
      ON CONFLICT DO NOTHING
      RETURNING id`;
    return rows[0]?.id ?? null;
  }

  /** AF-R06: bảng của Affiliate; tên khách đọc qua Account.MemberDirectory. */
  async forNotice(id: string, tx: DbTx): Promise<CommissionNotice | null> {
    const rows = await tx.$queryRaw<CommissionNotice[]>`
      SELECT a.user_id AS "userId", a.code, c.amount, c.referred_user_id AS "customerId",
             c.source::text AS source, c.list_amount AS "listAmount"
      FROM commissions c
      JOIN affiliates a ON a.id = c.affiliate_id
      WHERE c.id = ${id}`;
    return rows[0] ?? null;
  }
}
