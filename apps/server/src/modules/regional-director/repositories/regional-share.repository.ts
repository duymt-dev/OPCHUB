import { Injectable } from '@nestjs/common';
import { type DbTx, Prisma } from '@opchub/db';
import type { RegionalRegion } from '@opchub/shared/api-domains';

@Injectable()
export class RegionalShareRepository {
  async directorAt(tx: DbTx, region: RegionalRegion, at: Date) {
    const [slot] = await tx.$queryRaw<{ userId: string | null; appointedAt: Date | null }[]>`
      SELECT user_id AS "userId", appointed_at AS "appointedAt" FROM regional_directors
      WHERE region = ${region}::region FOR SHARE`;
    return slot?.userId && slot.appointedAt && slot.appointedAt <= at ? slot.userId : null;
  }

  async record(tx: DbTx, data: Prisma.RegionalShareCreateManyInput) {
    // createMany(skipDuplicates) provides ON CONFLICT without aborting the transaction.
    const rows = await tx.regionalShare.createManyAndReturn({
      data: [data],
      skipDuplicates: true,
      select: { id: true },
    });
    return rows[0]?.id ?? null;
  }
}
