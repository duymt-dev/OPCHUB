import { members, provinces } from '@opchub/shared/fixtures';
import { MOCK_NOW } from '@opchub/shared/mock-domains';
import { REGIONAL_REGIONS, regionalBankSchema } from '@opchub/shared/api-domains';
import type { DbTx } from '../../src/client';

/** D-120 prototype demo. Bulk writes preserve each person's previous deadline. */
export async function seedRegionalDirectors(tx: DbTx) {
  const ids = ['m3', 'm9', 'm10'];
  const fees = await tx.membershipFee.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, status: true, validUntil: true },
  });
  await tx.regionalDirector.createMany({
    data: REGIONAL_REGIONS.map((region, i) => {
      const userId = ids[i];
      const member = members.find((m) => m.id === userId);
      const fee = fees.find((f) => f.userId === userId);
      if (!member || !fee) throw new Error('Missing regional demo member');
      return {
        region,
        userId: member.id,
        appointedAt: new Date(MOCK_NOW),
        appointedBy: 'admin',
        prevFeeStatus: fee.status,
        prevValidUntil: fee.validUntil,
        bankName: 'Vietcombank',
        bankNo: `0011 00${i + 1}0 4567`,
        bankHolder: regionalBankSchema.shape.bankHolder.parse(member.name),
        updatedAt: new Date(MOCK_NOW),
      };
    }),
  });
  const regions = { 'Miền Bắc': 'north', 'Miền Trung': 'central', 'Miền Nam': 'south' } as const;
  await tx.regionalDirectorProvince.createMany({
    data: provinces.map(([province, label]) => {
      const region = regions[label as keyof typeof regions];
      if (!region) throw new Error(`Unknown province region: ${label}`);
      return { province, region };
    }),
  });
  // Keep seed ordering timestamps; Prisma @updatedAt would move these three above m1.
  await tx.$executeRaw`UPDATE membership_fees
    SET status = 'regional_director', valid_until = NULL, version = version + 1
    WHERE user_id = ANY(${ids}::text[])`;
}
