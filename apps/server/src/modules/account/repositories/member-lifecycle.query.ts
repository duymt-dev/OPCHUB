import { Prisma } from '@opchub/db';

export interface MemberLifecycleRow {
  id: string;
  status: 'active' | 'locked';
  lockedUntil: Date | null;
  deletedAt: Date | null;
}

export const memberLifecycleQuery = (ids: readonly string[]) => Prisma.sql`
  SELECT id,status,locked_until AS "lockedUntil",deleted_at AS "deletedAt"
  FROM users WHERE id=ANY(${[...ids]}::text[]) ORDER BY id FOR SHARE`;
