import { Injectable } from '@nestjs/common';
import { type DbTx } from '@opchub/db';
import type {
  DirectorConfigPatch,
  DirectorHistoryQuery,
  DirectorRegion,
} from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { directorHistoryQuery } from './regional-director-history.query';
import { activeAffiliateUsersQuery } from './regional-director-count.query';
import { RegionalDirectorBankRepository } from './regional-director-bank.repository';

export interface DirectorLock {
  region: DirectorRegion;
  userId: string | null;
  version: number;
}

@Injectable()
export class RegionalDirectorRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly banks: RegionalDirectorBankRepository,
  ) {}

  slots(tx?: DbTx) {
    return (tx ?? this.prisma.db).regionalDirector.findMany({
      orderBy: { region: 'asc' },
      select: {
        region: true,
        userId: true,
        appointedAt: true,
        version: true,
        bankName: true,
        bankNo: true,
        bankHolder: true,
        provinces: { select: { province: true }, orderBy: { province: 'asc' } },
      },
    });
  }

  /** Only three rows: deterministic locking serializes province/slot edits without an external lock. */
  lockAll(tx: DbTx) {
    return tx.$queryRaw<DirectorLock[]>`SELECT region, user_id AS "userId", version
      FROM regional_directors ORDER BY region FOR UPDATE`;
  }

  async setIncumbent(tx: DbTx, from: DirectorLock, userId: string | null, at: Date) {
    if (from.userId) await this.banks.retain(tx, from.userId, from.region);
    const bank = userId ? await this.banks.forDirector(tx, userId) : null;
    const result = await tx.regionalDirector.updateMany({
      where: { region: from.region, version: from.version, userId: from.userId },
      data: {
        userId,
        appointedAt: userId ? at : null,
        version: { increment: 1 },
        bankName: bank?.bankName ?? null,
        bankNo: bank?.bankNo ?? null,
        bankHolder: bank?.bankHolder ?? null,
      },
    });
    return result.count === 1;
  }

  occupiedProvinces(tx: DbTx, region: DirectorRegion, provinces: string[]) {
    return tx.regionalDirectorProvince.findMany({
      where: { province: { in: provinces }, region: { not: region } },
      select: { province: true },
    });
  }

  async configure(tx: DbTx, from: DirectorLock, patch: DirectorConfigPatch) {
    const result = await tx.regionalDirector.updateMany({
      where: { region: from.region, version: from.version, userId: from.userId },
      data: {
        bankName: patch.bank?.bankName ?? null,
        bankNo: patch.bank?.bankNo ?? null,
        bankHolder: patch.bank?.bankHolder ?? null,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) return false;
    if (from.userId) await this.banks.save(tx, from.userId, patch.bank);
    await tx.regionalDirectorProvince.deleteMany({ where: { region: from.region } });
    if (patch.provinces.length)
      await tx.regionalDirectorProvince.createMany({
        data: patch.provinces.map((province) => ({ province, region: from.region })),
      });
    return true;
  }

  append(
    tx: DbTx,
    data: {
      region: DirectorRegion;
      action: 'appointed' | 'revoked' | 'updated';
      userId: string | null;
      memberName: string | null;
      actorId: string;
      actorName: string;
      actorRole: string;
      summary: string;
      createdAt: Date;
    },
  ) {
    return tx.regionalDirectorHistory.create({ data, select: { id: true } });
  }

  affiliateUserIds() {
    return this.prisma.db.$queryRaw<{ userId: string }[]>(activeAffiliateUsersQuery());
  }

  async history(query: DirectorHistoryQuery) {
    return this.prisma.db.$queryRaw<
      {
        id: string;
        region: DirectorRegion;
        action: 'appointed' | 'revoked' | 'updated';
        memberName: string | null;
        actorName: string;
        actorRole: string;
        at: Date;
        summary: string;
      }[]
    >(directorHistoryQuery(query));
  }
}
