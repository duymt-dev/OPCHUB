import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import { PAID_FEE_STATUS } from '@opchub/shared';
import { PrismaService } from '@/common/prisma/prisma.service';
import { earliestRegionalGroup } from './regional/earliest-group.sql';

export interface ConversionAggregate {
  region: 'north' | 'central' | 'south' | null;
  directorName: string | null;
  trial: bigint;
  paid: bigint;
  expired: bigint;
}
/** BR-475: one snapshot includes groupless members for the national total only. */
export const conversionQuery = Prisma.sql`
  SELECT regions.region::text AS region,d.full_name AS "directorName",
    COALESCE(tally.trial,0)::bigint AS trial,COALESCE(tally.paid,0)::bigint AS paid,
    COALESCE(tally.expired,0)::bigint AS expired
  FROM (VALUES ('north'::region),('central'::region),('south'::region),(NULL::region)) regions(region)
  LEFT JOIN (
    SELECT area.region,count(*) FILTER (WHERE f.status='trial') AS trial,
      count(*) FILTER (WHERE f.status::text=ANY(${[...PAID_FEE_STATUS]}::text[])) AS paid,
      count(*) FILTER (WHERE f.status IN ('expired','pending_payment')) AS expired
    FROM membership_fees f JOIN users u ON u.id=f.user_id
    LEFT JOIN LATERAL (${earliestRegionalGroup(Prisma.sql`u.id`)}) area ON true
    WHERE u.deleted_at IS NULL AND u.account_type<>'investor' AND f.status<>'regional_director'
    GROUP BY area.region
  ) tally ON tally.region IS NOT DISTINCT FROM regions.region
  LEFT JOIN regional_directors r ON r.region=regions.region
  LEFT JOIN users d ON d.id=r.user_id
`;

@Injectable()
export class ConversionRepository {
  constructor(private readonly prisma: PrismaService) {}
  aggregate() {
    return this.prisma.db.$queryRaw<ConversionAggregate[]>(conversionQuery);
  }
}
