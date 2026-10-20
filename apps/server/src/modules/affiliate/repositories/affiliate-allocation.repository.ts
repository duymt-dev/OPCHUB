import { Injectable } from '@nestjs/common';
import { Prisma, type AffiliateStatus, type DbTx } from '@opchub/db';

/** Khoá cấp mã dùng chung giữa các worker và backfill, không giữ ngoài transaction. */
@Injectable()
export class AffiliateAllocationRepository {
  async lock(tx: DbTx): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(21404, 401)::text`;
  }

  takenCodes(tx: DbTx, codes: string[]) {
    return tx.affiliate.findMany({ where: { code: { in: codes } }, select: { code: true } });
  }

  existingUsers(tx: DbTx, userIds: string[]) {
    return tx.affiliate.findMany({ where: { userId: { in: userIds } }, select: { userId: true } });
  }

  /** Một INSERT…SELECT cho cả lô; unique user_id vẫn bảo vệ retry. */
  async insertBatch(
    tx: DbTx,
    rows: { userId: string; code: string; rate: number; status: AffiliateStatus }[],
  ): Promise<number> {
    if (!rows.length) return 0;
    return tx.$executeRaw(Prisma.sql`
      INSERT INTO affiliates (id, user_id, code, rate, status, updated_at)
      SELECT gen_random_uuid()::text, r.user_id, r.code, r.rate, r.status::affiliate_status, now()
      FROM jsonb_to_recordset(${JSON.stringify(
        rows.map((r) => ({
          user_id: r.userId,
          code: r.code,
          rate: r.rate,
          status: r.status,
        })),
      )}::jsonb) AS r(user_id text, code text, rate integer, status text)
      ON CONFLICT (user_id) DO NOTHING`);
  }
}
