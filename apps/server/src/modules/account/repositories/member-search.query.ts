import { Prisma } from '@opchub/db';
import { containsPattern } from '@/common/prisma/like';

/** Keep the expression identical to users_search (GIN/trigram). */
export const memberSearchQuery = (q: string) => Prisma.sql`
  SELECT id FROM users WHERE deleted_at IS NULL AND
    (immutable_unaccent(full_name) || ' ' || email::text) ILIKE immutable_unaccent(${containsPattern(q)})`;
