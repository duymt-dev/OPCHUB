import { Injectable } from '@nestjs/common';
import { type DbTx, Prisma } from '@opchub/db';
import type { RegionalRegion } from '@opchub/shared/api-domains';

export interface RegionalShareAggregate {
  region: RegionalRegion;
  userId: string;
  status: 'pending' | 'paid';
  closed: boolean;
  amount: bigint;
  count: bigint;
  affiliates: string[];
  months: string[];
}
@Injectable()
export class RegionalShareSummaryRepository {
  aggregate(tx: DbTx, month: string) {
    return tx.$queryRaw<RegionalShareAggregate[]>`
      SELECT region,director_user_id AS "userId",status,(month_key < ${month}) AS closed,
        sum(director_amount) AS amount,count(*) AS count,
        array_agg(DISTINCT affiliate_id) AS affiliates,array_agg(DISTINCT month_key::text) AS months
      FROM regional_shares WHERE region IS NOT NULL
      GROUP BY region,status,month_key,director_user_id`;
  }
  async payeeBanks(tx: DbTx, ids: string[]) {
    if (!ids.length) return [];
    return tx.$queryRaw<{ userId: string; region: RegionalRegion; bank: unknown }[]>(Prisma.sql`
      SELECT owners.user_id AS "userId",owners.region,bank.bank FROM (
        SELECT DISTINCT region,director_user_id AS user_id FROM regional_shares
        WHERE director_user_id IN (${Prisma.join(ids)}) AND region IS NOT NULL
      ) owners JOIN LATERAL (
        SELECT bank FROM (
          (SELECT bank_snapshot AS bank,paid_at AS at FROM regional_payouts
            WHERE region=owners.region AND director_user_id=owners.user_id ORDER BY paid_at DESC,id DESC LIMIT 1)
          UNION ALL
          (SELECT bank_snapshot AS bank,created_at AS at FROM regional_director_events
            WHERE region=owners.region AND user_id=owners.user_id AND action='revoke' AND bank_snapshot IS NOT NULL
            ORDER BY created_at DESC,id DESC LIMIT 1)
        ) candidates ORDER BY at DESC LIMIT 1
      ) bank ON true`);
  }
}
