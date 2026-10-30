import type { DbTx } from '../../src/client';

/** D-94 3A: every member has an affiliate; preserve older paid-member codes like MSW. */
export async function seedAffiliates(tx: DbTx): Promise<void> {
  const rows = await tx.membershipFee.findMany({
    where: {
      user: { deletedAt: null, accountType: { not: 'investor' } },
    },
    select: { userId: true, status: true, paidAt: true, directorPreviousStatus: true },
    orderBy: { userId: 'asc' },
  });
  const paid = rows.filter((row) => {
    const status = row.directorPreviousStatus ?? row.status;
    return row.paidAt && (status === 'active' || status === 'expiring');
  });
  const ordered = [...paid, ...rows.filter((row) => !paid.includes(row))];
  // Like all demo settings, reset after a test edits policy; required/production seed preserves it.
  const policy = await tx.affiliatePolicy.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: { defaultRate: 20, cookieDays: 30, fundraisingRate: 10, terms: '' },
  });
  await tx.affiliate.createMany({
    data: ordered.map((r, i) => ({
      id: r.userId === 'm1' ? 'a1' : `demo-affiliate-${r.userId}`,
      userId: r.userId,
      // Mã m1 và tài khoản nhận là dữ liệu prototype, các mã còn lại ổn định giữa lượt seed.
      code:
        r.userId === 'm1'
          ? 'OPCAN26'
          : i < paid.length
            ? `DEMOOPC${i + 10}`
            : `OPC${1001 + i - paid.length}`,
      rate: policy.defaultRate,
      status: 'active',
      ...(r.paidAt ? { createdAt: r.paidAt } : {}),
      ...(r.userId === 'm1'
        ? {
            bankName: 'Vietcombank',
            bankNo: '0451000123456',
            bankHolder: 'NGUYEN VAN AN',
          }
        : {}),
    })),
    skipDuplicates: true,
  });
}
