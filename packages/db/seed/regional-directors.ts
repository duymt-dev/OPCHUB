import type { DbTx } from '../src/client';
import { GROUPS } from './catalog';

/** Initialize catalog only; seed reruns must never overwrite Admin province assignments. */
export async function seedDirectorProvinces(tx: DbTx): Promise<void> {
  const [changed, assigned] = await Promise.all([
    tx.regionalDirector.count({ where: { version: { gt: 1 } } }),
    tx.regionalDirectorProvince.count(),
  ]);
  if (changed || assigned) return;
  await tx.regionalDirectorProvince.createMany({
    data: GROUPS.map((group) => ({ province: group.province, region: group.region })),
    skipDuplicates: true,
  });
}
