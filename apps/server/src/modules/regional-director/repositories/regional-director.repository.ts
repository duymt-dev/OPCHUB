import { Injectable } from '@nestjs/common';
import { type DbTx, Prisma, type RegionalDirectorModel as RegionalDirector } from '@opchub/db';
import type { RegionalRegion } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RegionalDirectorRepository {
  constructor(private readonly prisma: PrismaService) {}

  slots() {
    return this.prisma.db.regionalDirector.findMany({
      orderBy: { region: 'asc' },
      select: {
        region: true,
        bankName: true,
        bankNo: true,
        bankHolder: true,
        userId: true,
        provinces: { select: { province: true } },
      },
    });
  }

  history() {
    // Deferred join: choose 50 narrow IDs before reading snapshot names/roles.
    return this.prisma.db.$queryRaw<
      {
        id: string;
        region: RegionalRegion;
        userId: string;
        userName: string;
        action: 'appoint' | 'revoke';
        actorRole: string;
        createdAt: Date;
      }[]
    >`SELECT e.id, e.region, e.user_id AS "userId", e.user_name AS "userName",
      e.action, e.actor_role AS "actorRole", e.created_at AS "createdAt"
      FROM (SELECT id FROM regional_director_events ORDER BY created_at DESC, id DESC LIMIT 50) p
      JOIN LATERAL (
        SELECT id, region, user_id, user_name, action, actor_role, created_at
        FROM regional_director_events WHERE id = p.id LIMIT 1
      ) e ON true ORDER BY e.created_at DESC, e.id DESC`;
  }

  async lock(tx: DbTx, region: RegionalRegion): Promise<RegionalDirector | null> {
    // NOWAIT ensures overlapping writes conflict instead of silently replacing the first winner.
    await tx.$queryRaw`SELECT region FROM regional_directors WHERE region = ${region}::region FOR UPDATE NOWAIT`;
    return tx.regionalDirector.findUnique({ where: { region } });
  }

  update(tx: DbTx, slot: RegionalDirector, data: Prisma.RegionalDirectorUncheckedUpdateManyInput) {
    return tx.regionalDirector.updateMany({
      where: { region: slot.region, version: slot.version },
      data: { ...data, version: { increment: 1 } },
    });
  }

  occupied(tx: DbTx, userId: string) {
    return tx.regionalDirector.findUnique({ where: { userId }, select: { region: true } });
  }

  provinces(tx: DbTx, region: RegionalRegion) {
    return tx.regionalDirectorProvince.findMany({ where: { region }, select: { province: true } });
  }

  async replaceProvinces(tx: DbTx, region: RegionalRegion, provinces: string[]) {
    await tx.regionalDirectorProvince.deleteMany({ where: { region } });
    if (provinces.length)
      await tx.regionalDirectorProvince.createMany({
        data: provinces.map((province) => ({ region, province })),
      });
  }

  event(tx: DbTx, data: Prisma.RegionalDirectorEventCreateManyInput) {
    return tx.regionalDirectorEvent.create({ data, select: { id: true } });
  }
}
