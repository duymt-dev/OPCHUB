import { Prisma } from '@opchub/db';

/**
 * D-94 3A: mọi TV (có bản ghi phí — kể cả trial) không phải NĐT / xoá mềm. Keyset bằng PK user_id;
 * lấy đúng lô ID trước khi JOIN tên thành viên (deferred join).
 */
export const paidMembersQuery = (after: string | undefined, size: number) => Prisma.sql`
  SELECT p.user_id AS "userId", p.status::text AS status,
         p.valid_until AS "validUntil", u.full_name AS "fullName"
  FROM (
    SELECT f.user_id, f.status, f.valid_until
    FROM membership_fees f
    JOIN LATERAL (
      SELECT 1 FROM users m WHERE m.id = f.user_id AND m.deleted_at IS NULL
        AND m.account_type <> 'investor' LIMIT 1
    ) eligible ON true
    WHERE f.user_id > ${after ?? ''}
    ORDER BY f.user_id ASC LIMIT ${size}
  ) p
  JOIN LATERAL (SELECT full_name FROM users u WHERE u.id = p.user_id LIMIT 1) u ON true
  ORDER BY p.user_id ASC`;
