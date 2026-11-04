import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';

/** D-130: both consumers establish the same canonical anchor in their own transaction. */
@Injectable()
export class CustomerYearRepository {
  async firstPaid(
    tx: DbTx,
    userId: string,
    at: Date,
    source: 'membership' | 'fundraising',
    sourceId: string,
  ) {
    await tx.$executeRaw`INSERT INTO customer_years(user_id, first_paid_at, source, source_id)
      VALUES (${userId}, ${at}, ${source}::regional_share_source, ${sourceId}) ON CONFLICT DO NOTHING`;
    return tx.customerYear.findUniqueOrThrow({ where: { userId }, select: { firstPaidAt: true } });
  }
}
