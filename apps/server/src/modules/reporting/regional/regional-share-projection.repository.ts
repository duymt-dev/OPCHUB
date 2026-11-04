import { Injectable } from '@nestjs/common';
import { type DbTx, Prisma } from '@opchub/db';
import type { RegionalRegion } from '@opchub/shared/api-domains';

export interface ShareCursor {
  recordedAt: string;
  id: string;
}
@Injectable()
export class RegionalShareProjectionRepository {
  members(tx: DbTx, ids: string[]) {
    return tx.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true, email: true },
    });
  }
  async page(tx: DbTx, region: RegionalRegion, cursor: ShareCursor | undefined, limit: number) {
    const before = cursor
      ? Prisma.sql`AND (recorded_at,id) < (${new Date(cursor.recordedAt)},${cursor.id})`
      : Prisma.empty;
    return tx.$queryRaw<
      {
        id: string;
        recordedAt: Date;
        customerName: string;
        affiliateName: string;
        plan: 'personal' | 'business' | 'fundraising';
        baseAmount: number;
        customerYear: number;
        percent: number;
        directorAmount: number;
        status: 'pending' | 'paid';
      }[]
    >(Prisma.sql`
      SELECT s.id,s.recorded_at AS "recordedAt",COALESCE(c.full_name,'Thành viên đã xóa') AS "customerName",
        COALESCE(a.full_name,'Thành viên đã xóa') AS "affiliateName",s.plan,s.base_amount AS "baseAmount",
        s.customer_year AS "customerYear",s.percent,s.director_amount AS "directorAmount",s.status
      FROM (SELECT id,recorded_at FROM regional_shares WHERE region=${region}::region ${before}
        ORDER BY recorded_at DESC,id DESC LIMIT ${limit}) page
      JOIN LATERAL (SELECT id,recorded_at,customer_id,affiliate_user_id,plan,base_amount,customer_year,
        percent,director_amount,status FROM regional_shares WHERE id=page.id LIMIT 1) s ON true
      LEFT JOIN users c ON c.id=s.customer_id LEFT JOIN users a ON a.id=s.affiliate_user_id
      ORDER BY s.recorded_at DESC,s.id DESC`);
  }
  remaining(tx: DbTx, region: RegionalRegion, cursor: ShareCursor | undefined) {
    const before = cursor
      ? Prisma.sql`AND (recorded_at,id) < (${new Date(cursor.recordedAt)},${cursor.id})`
      : Prisma.empty;
    return tx.$queryRaw<
      { count: bigint }[]
    >(Prisma.sql`SELECT count(*) AS count FROM regional_shares
      WHERE region=${region}::region ${before}`);
  }
  history(tx: DbTx, region: RegionalRegion) {
    return tx.$queryRaw<
      { id: string; monthKeys: string[]; paidAt: Date; amount: bigint; directorName: string }[]
    >`
      SELECT p.id,p.month_keys AS "monthKeys",p.paid_at AS "paidAt",p.amount,
        COALESCE(u.full_name,'Thành viên đã xóa') AS "directorName"
      FROM (SELECT id,paid_at FROM regional_payouts WHERE region=${region}::region
        ORDER BY paid_at DESC,id DESC LIMIT 50) page
      JOIN LATERAL (SELECT id,month_keys,paid_at,amount,director_user_id FROM regional_payouts WHERE id=page.id LIMIT 1) p ON true
      LEFT JOIN users u ON u.id=p.director_user_id ORDER BY p.paid_at DESC,p.id DESC`;
  }
}
