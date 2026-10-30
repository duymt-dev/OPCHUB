import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { AffiliateBank, DirectorRegion } from '@opchub/shared/api-domains';

const bankSelect = { bankName: true, bankNo: true, bankHolder: true } as const;

@Injectable()
export class RegionalDirectorBankRepository {
  forDirector(tx: DbTx, directorId: string) {
    return tx.revenueRecipientBank.findUnique({ where: { directorId }, select: bankSelect });
  }

  /** Caller already holds regional locks. Preserve even an explicitly cleared destination. */
  async retain(tx: DbTx, directorId: string, region: DirectorRegion) {
    const bank = await tx.regionalDirector.findUniqueOrThrow({
      where: { region },
      select: bankSelect,
    });
    await tx.revenueRecipientBank.upsert({
      where: { directorId },
      create: { directorId, ...bank },
      update: bank,
    });
  }

  save(tx: DbTx, directorId: string, bank: AffiliateBank | null) {
    const data = {
      bankName: bank?.bankName ?? null,
      bankNo: bank?.bankNo ?? null,
      bankHolder: bank?.bankHolder ?? null,
    };
    return tx.revenueRecipientBank.upsert({
      where: { directorId },
      create: { directorId, ...data },
      update: data,
    });
  }
}
