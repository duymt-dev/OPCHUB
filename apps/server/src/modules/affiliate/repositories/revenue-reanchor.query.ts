import { Prisma } from '@opchub/db';

/** D-122: a late older receipt corrects UNPAID allocations only; beneficiary/policy remain snapshots. */
export const reanchorUnpaidQuery = (customerId: string, first: Date) => Prisma.sql`
  WITH dates AS (
    SELECT id, director_id, minimum_rate, year_one_rate, annual_decrease,
      received_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS received,
      ${first}::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh' AS first,
      EXTRACT(YEAR FROM received_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int
        - EXTRACT(YEAR FROM ${first}::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS years
    FROM revenue_shares WHERE customer_id = ${customerId} AND status = 'recorded'
      AND first_received_at > ${first}
  ), ages AS (
    SELECT id, director_id, minimum_rate, year_one_rate, annual_decrease,
      years + CASE WHEN received >= first + years * interval '1 year' THEN 1 ELSE 0 END AS year
    FROM dates
  ), rates AS (
    SELECT id, year, CASE WHEN director_id IS NULL THEN 0 ELSE
      GREATEST(minimum_rate::bigint, year_one_rate::bigint - annual_decrease::bigint * (year - 1)) END AS rate
    FROM ages
  )
  UPDATE revenue_shares s SET first_received_at = ${first}, customer_year = r.year,
    director_rate = r.rate, director_amount = (s.amount::bigint * r.rate + 50) / 100,
    media_soft_amount = s.amount - (s.amount::bigint * r.rate + 50) / 100, updated_at = now()
  FROM rates r WHERE s.id = r.id AND s.customer_id = ${customerId}
    AND s.status = 'recorded' AND s.first_received_at > ${first}`;
