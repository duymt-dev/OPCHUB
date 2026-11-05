import { Prisma } from '@opchub/db';

/** BR-463: historic zero rows stay stored, but are never a visible commission. */
export const commissionVisible = Prisma.sql`c.amount > 0`;
