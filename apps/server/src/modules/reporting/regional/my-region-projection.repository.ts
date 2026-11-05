import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { RegionalRegion } from '@opchub/shared/api-domains';
import { myRegionQueries } from './my-region.queries';

type Totals = { count: number; revenue: bigint; share: bigint };
@Injectable()
export class MyRegionProjectionRepository {
  async read(tx: DbTx, region: RegionalRegion, userId: string) {
    const sql = myRegionQueries(region, userId);
    const [kpi, years, affiliates, months] = await Promise.all([
      tx.$queryRaw<(Totals & { paid: bigint; paidMonths: number })[]>(sql.kpi),
      tx.$queryRaw<(Totals & { year: number })[]>(sql.years),
      tx.$queryRaw<
        {
          id: string;
          name: string;
          code: string;
          customers: number;
          revenue: bigint;
          share: bigint;
          total: number;
        }[]
      >(sql.affiliates),
      tx.$queryRaw<
        { monthKey: string; amount: bigint; status: 'paid' | 'pending'; paidAt: Date | null }[]
      >(sql.months),
    ]);
    return { kpi: kpi[0], years, affiliates, months };
  }
}
