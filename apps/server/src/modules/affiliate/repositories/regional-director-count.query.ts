import { Prisma } from '@opchub/db';

/** Only identities cross the community directory boundary, never affiliate money/profile rows. */
export const activeAffiliateUsersQuery = () => Prisma.sql`
  SELECT user_id AS "userId" FROM affiliates WHERE status = 'active' ORDER BY user_id`;
