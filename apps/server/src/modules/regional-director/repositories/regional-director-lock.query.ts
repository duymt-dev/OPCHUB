import { Prisma } from '@opchub/db';

export const regionalDirectorLockQuery = (ids: string[]) => Prisma.sql`
  SELECT region FROM regional_directors
  WHERE user_id=ANY(${ids}::text[]) ORDER BY region FOR UPDATE NOWAIT`;
