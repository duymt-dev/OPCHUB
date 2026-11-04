import { Injectable } from '@nestjs/common';
import { type DbTx, Prisma } from '@opchub/db';
import type { RegionalRegion } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { containsPattern } from '@/common/prisma/like';
import { earliestRegionalGroup } from './earliest-group.sql';

/** Read-only cross-domain projection: reporting is the approved boundary exception. */
@Injectable()
export class RegionalProjectionRepository {
  constructor(private readonly prisma: PrismaService) {}
  candidates(region: RegionalRegion, q: string) {
    const search = q
      ? Prisma.sql`AND (immutable_unaccent(u.full_name) || ' ' || u.email::text)
      ILIKE immutable_unaccent(${containsPattern(q)})`
      : Prisma.empty;
    return this.prisma.db.$queryRaw<{ id: string; fullName: string; email: string }[]>(Prisma.sql`
      SELECT u.id, u.full_name AS "fullName", u.email FROM (
        SELECT u.id, u.member_code FROM users u
        WHERE u.deleted_at IS NULL AND u.status = 'active' AND u.account_type <> 'investor'
          AND NOT EXISTS (SELECT 1 FROM regional_directors r
            WHERE r.user_id = u.id AND r.region <> ${region}::region) ${search}
        ORDER BY u.member_code, u.id LIMIT 20
      ) page JOIN users u ON u.id = page.id ORDER BY page.member_code, page.id`);
  }

  /** D-128/129: earliest live group per affiliate, with industry mapped to its parent. */
  counts() {
    return this.prisma.db.$queryRaw<{ region: RegionalRegion; count: bigint }[]>(Prisma.sql`
      SELECT first_group.region, count(*) AS count FROM affiliates a
      JOIN LATERAL (${earliestRegionalGroup(Prisma.sql`a.user_id`)}) first_group ON true
      GROUP BY first_group.region`);
  }

  async affiliateRegionAt(tx: DbTx, userId: string) {
    const [row] = await tx.$queryRaw<{ region: RegionalRegion | null }[]>(
      earliestRegionalGroup(Prisma.sql`${userId}`),
    );
    return row?.region ?? null;
  }

  async customerFirstPaid(tx: DbTx, userId: string) {
    // D-130: migration and first-receipt insertion establish the canonical anchor once.
    const row = await tx.customerYear.findUnique({
      where: { userId },
      select: { firstPaidAt: true },
    });
    return row?.firstPaidAt ?? null;
  }

  member(tx: DbTx, id: string) {
    return tx.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, fullName: true, status: true, accountType: true },
    });
  }

  validProvinces(tx: DbTx, region: RegionalRegion, provinces: string[]) {
    return tx.group.count({
      where: {
        kind: 'province',
        deletedAt: null,
        region,
        province: { in: provinces },
      },
    });
  }
}
