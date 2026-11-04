import type { DbTx } from '../../src/client';

/** Đại lý demo chỉ cho TV có kỳ phí, cùng nguyên tắc backfill go-live (AF-R01). */
export async function seedAffiliates(tx: DbTx): Promise<void> {
  const rows = await tx.membershipFee.findMany({
    where: {
      user: { deletedAt: null, accountType: { not: 'investor' }, feePeriods: { some: {} } },
    },
    select: { userId: true, status: true, paidAt: true },
    orderBy: { userId: 'asc' },
  });
  // Like all demo settings, reset after a test edits policy; required/production seed preserves it.
  const policy = await tx.affiliatePolicy.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {
      defaultRate: 20,
      cookieDays: 30,
      fundraisingRate: 10,
      terms: '',
      regionalFirstYear: 50,
      regionalStep: 10,
      regionalMin: 20,
    },
  });
  await tx.affiliate.createMany({
    data: rows.map((r, i) => ({
      id: r.userId === 'm1' ? 'a1' : `demo-affiliate-${r.userId}`,
      userId: r.userId,
      // Mã m1 và tài khoản nhận là dữ liệu prototype, các mã còn lại ổn định giữa lượt seed.
      code: r.userId === 'm1' ? 'OPCAN26' : `DEMOOPC${i + 10}`,
      rate: policy.defaultRate,
      status: r.status === 'active' || r.status === 'expiring' ? 'active' : 'paused',
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
