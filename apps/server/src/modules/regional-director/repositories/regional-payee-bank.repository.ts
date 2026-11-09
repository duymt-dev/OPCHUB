import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { regionalBankSchema, type RegionalRegion } from '@opchub/shared/api-domains';
import type { z } from 'zod';

@Injectable()
export class RegionalPayeeBankRepository {
  async eligible(tx: DbTx, region: RegionalRegion, userId: string) {
    const [share, event] = await Promise.all([
      tx.regionalShare.findFirst({
        where: { region, directorUserId: userId, status: 'pending' },
        select: { id: true },
      }),
      tx.regionalDirectorEvent.findFirst({
        where: { region, userId, action: 'revoke' },
        select: { id: true },
      }),
    ]);
    return Boolean(share || event);
  }

  async save(
    tx: DbTx,
    region: RegionalRegion,
    userId: string,
    bank: z.infer<typeof regionalBankSchema>,
    updatedBy: string,
  ) {
    await tx.regionalPayeeBank.upsert({
      where: { region_userId: { region, userId } },
      create: { region, userId, ...bank, updatedBy },
      update: { ...bank, updatedBy },
      select: { userId: true },
    });
  }
}
