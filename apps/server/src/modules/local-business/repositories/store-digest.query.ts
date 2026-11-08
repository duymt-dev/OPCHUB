import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import type { FeeLike } from '@opchub/shared';
import { usableFeeSql } from '@/common/auth';

export interface StoreDigestRow {
  id: string;
  userId: string;
  views: number;
  feeStatus: FeeLike['status'];
  validUntil: Date | null;
}
export const storeDigestQuery = (day: string, cursor: string, now: Date) => Prisma.sql`
  SELECT v.store_id AS id,s.owner_id AS "userId",v.views,
    f.status AS "feeStatus",f.valid_until AS "validUntil"
  FROM store_daily_views v JOIN stores s ON s.id=v.store_id
    JOIN users u ON u.id=s.owner_id JOIN membership_fees f ON f.user_id=u.id
  WHERE v.day=${day}::date AND v.store_id>${cursor} AND v.views>0
    AND s.status<>'hidden' AND u.deleted_at IS NULL AND (${usableFeeSql('f', now)} OR f.valid_until IS NULL)
  ORDER BY v.store_id LIMIT 1000`;

@Injectable()
export class StoreDigestRepository {
  async lock(tx: DbTx, day: string) {
    await tx.$executeRaw`INSERT INTO store_digest_runs(day) VALUES(${day}::date) ON CONFLICT DO NOTHING`;
    return (
      await tx.$queryRaw<{ cursor: string; completedAt: Date | null }[]>`
      SELECT cursor,completed_at AS "completedAt" FROM store_digest_runs WHERE day=${day}::date FOR UPDATE`
    )[0];
  }
  page(tx: DbTx, day: string, cursor: string, now: Date) {
    return tx.$queryRaw<StoreDigestRow[]>(storeDigestQuery(day, cursor, now));
  }
  async advance(tx: DbTx, day: string, cursor: string, completed: boolean) {
    await tx.$executeRaw`UPDATE store_digest_runs SET cursor=${cursor},
      completed_at=CASE WHEN ${completed} THEN now() ELSE NULL END WHERE day=${day}::date`;
  }
}
