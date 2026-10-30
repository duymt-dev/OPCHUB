import { DIRECTOR_DEMO } from '@opchub/shared/fixtures';
import { Prisma, type DbTx } from '../../src/index';
import { GROUPS } from '../catalog';

/** Explicit demo reset only. Production required seed continues to preserve Admin edits. */
export async function resetDemoDirectors(tx: DbTx): Promise<void> {
  await tx.regionalDirector.updateMany({
    data: {
      userId: null,
      appointedAt: null,
      version: 1,
      bankName: null,
      bankNo: null,
      bankHolder: null,
    },
  });
  await tx.regionalDirectorHistory.deleteMany({});
  await tx.regionalDirectorProvince.deleteMany({});
  await tx.regionalDirectorProvince.createMany({
    data: GROUPS.map((g) => ({ province: g.province, region: g.region })),
  });
}

/** Native equivalent of the shared demo; never run appointment commands or enqueue mail. */
export async function seedDemoDirectors(tx: DbTx): Promise<void> {
  const values = Prisma.join(
    DIRECTOR_DEMO.map(
      (row) => Prisma.sql`(
    ${row.region}, ${row.userId}, ${new Date(row.appointedAt)},
    ${row.bank.bankName}, ${row.bank.bankNo}, ${row.bank.bankHolder})`,
    ),
  );
  await tx.$executeRaw`
    UPDATE membership_fees f SET
      director_previous_status = f.status, director_previous_valid_until = f.valid_until,
      status = 'regional_director'
    FROM regional_directors d JOIN (VALUES ${values}) v(region, user_id, appointed_at, bank_name, bank_no, bank_holder)
      ON d.region = v.region::region
    JOIN users u ON u.id = v.user_id AND u.deleted_at IS NULL AND u.status = 'active'
    WHERE f.user_id = u.id AND f.status <> 'regional_director'
      AND d.version = 1 AND (d.user_id IS NULL OR d.user_id = u.id)`;
  await tx.$executeRaw`
    UPDATE regional_directors d SET user_id = v.user_id, appointed_at = v.appointed_at::timestamptz,
      bank_name = v.bank_name, bank_no = v.bank_no, bank_holder = v.bank_holder
    FROM (VALUES ${values}) v(region, user_id, appointed_at, bank_name, bank_no, bank_holder)
    JOIN membership_fees f ON f.user_id = v.user_id AND f.status = 'regional_director'
    WHERE d.region = v.region::region AND d.version = 1 AND (d.user_id IS NULL OR d.user_id = v.user_id)`;
  const slots = await tx.regionalDirector.findMany({ select: { region: true, userId: true } });
  if (
    DIRECTOR_DEMO.some(
      (demo) => !slots.some((slot) => slot.region === demo.region && slot.userId === demo.userId),
    )
  )
    throw new Error(
      'Incomplete director demo: expected three registered members and fee snapshots',
    );
}
