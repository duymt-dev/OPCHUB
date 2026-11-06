import { Prisma, type DbTx } from '@opchub/db';
import { storeSlugBase } from '@opchub/shared';
import { chooseStoreSlug } from '../domain/store-slug';

/** BR-494: one indexed read, with bounds on the unique B-tree before the LIKE predicate. */
export async function allocateStoreSlug(tx: DbTx, name: string) {
  const base = storeSlugBase(name);
  const rows = await tx.$queryRaw<{ slug: string }[]>(Prisma.sql`
    SELECT slug FROM stores WHERE slug = ${base} OR
      (slug >= ${base + '-'} AND slug < ${base + '.'} AND slug LIKE ${base + '-%'})`);
  return chooseStoreSlug(
    name,
    rows.map((r) => r.slug),
  );
}
