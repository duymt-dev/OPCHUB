import { Prisma } from '@opchub/db';

/** Lock before calculating; concurrent reanchor must finish before amounts are returned. */
export const revenuePayoutLockQuery = (directorId: string, month: string) => Prisma.sql`
  SELECT id, director_name AS "directorName", region, director_amount AS "directorAmount",
    bank_name AS "bankName", bank_no AS "bankNo", bank_holder AS "bankHolder", recorded_at AS "recordedAt"
  FROM revenue_shares WHERE director_id = ${directorId} AND month_key = ${month}
    AND status = 'recorded' AND director_amount > 0 ORDER BY id FOR UPDATE`;
