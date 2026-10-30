import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import { reanchorUnpaidQuery } from './revenue-reanchor.query';

@Injectable()
export class RevenueSharingRepository {
  /** Compatible across receipts; blocks config/appointment writes. Must precede fee row locks. */
  async lockConfiguration(tx: DbTx): Promise<void> {
    await tx.$queryRaw`SELECT region FROM regional_directors ORDER BY region FOR SHARE`;
  }

  referrer(tx: DbTx, customerId: string) {
    return tx.referral.findUnique({
      where: { referredUserId: customerId },
      select: { status: true, affiliateId: true, affiliate: { select: { userId: true } } },
    });
  }

  slotForProvince(tx: DbTx, province: string) {
    return tx.regionalDirectorProvince.findUnique({
      where: { province },
      select: {
        region: true,
        director: {
          select: {
            userId: true,
            appointedAt: true,
            bankName: true,
            bankNo: true,
            bankHolder: true,
          },
        },
      },
    });
  }

  policy(tx: DbTx) {
    return tx.affiliatePolicy.findUniqueOrThrow({
      where: { id: 1 },
      select: { yearOneRate: true, annualDecrease: true, minimumRate: true },
    });
  }

  /** Single upsert serializes first receipts across membership and fundraising. */
  async firstReceipt(tx: DbTx, customerId: string, at: Date) {
    const [row] = await tx.$queryRaw<{ first: Date }[]>`
      INSERT INTO revenue_customers (user_id, first_received_at) VALUES (${customerId}, ${at})
      ON CONFLICT (user_id) DO UPDATE SET
        first_received_at = LEAST(revenue_customers.first_received_at, EXCLUDED.first_received_at),
        updated_at = now()
      WHERE revenue_customers.first_received_at > EXCLUDED.first_received_at
      RETURNING first_received_at AS first`;
    // ON CONFLICT still locks the existing row when its WHERE is false.
    const first = row?.first ?? (await this.lockAnchor(tx, customerId));
    if (!first) throw new Error('Missing first-receipt anchor');
    return { first, changed: Boolean(row) };
  }

  /** Unique(source, source_id) is the durable idempotency boundary, even across concurrent relays. */
  insert(tx: DbTx, row: Prisma.RevenueShareCreateManyInput) {
    return tx.revenueShare.createMany({
      skipDuplicates: true,
      data: [row],
    });
  }

  async lockAnchor(tx: DbTx, customerId: string) {
    const [row] = await tx.$queryRaw<{ first: Date }[]>`
      SELECT first_received_at AS first FROM revenue_customers WHERE user_id = ${customerId} FOR UPDATE`;
    return row?.first;
  }

  reanchorUnpaid(tx: DbTx, customerId: string, first: Date) {
    return tx.$executeRaw(reanchorUnpaidQuery(customerId, first));
  }

  paidBeforeCorrection(tx: DbTx, customerId: string, first: Date) {
    return tx.revenueShare.count({
      where: {
        customerId,
        status: 'paid',
        firstReceivedAt: { gt: first },
      },
    });
  }
}
