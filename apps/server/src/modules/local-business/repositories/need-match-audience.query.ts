import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import type { FeeLike, NeedMatchCandidate, NeedMatchStore } from '@opchub/shared';
import { usableFeeSql } from '@/common/auth';
import { PrismaService } from '@/common/prisma/prisma.service';
import { visibleNeedSql } from './search-visibility.query';

export interface PublishedNeed extends NeedMatchCandidate {
  ownerId: string;
}
export interface NeedAudience extends NeedMatchStore {
  userId: string;
  feeStatus: FeeLike['status'];
  validUntil: Date | null;
}
export const publishedNeedQuery = (needId: string, now: Date) => Prisma.sql`
  SELECT n.id,n.owner_id AS "ownerId",n.type,n.title,n.description,n.field,
    n.field_custom AS "fieldCustom",n.province,n.updated_at AS "updatedAt"
  FROM needs n WHERE n.id=${needId} AND ${visibleNeedSql(now)}`;

/** Equality prefilter and fee eligibility before the bounded late join to wide store text. */
export type NeedAudienceContext = Pick<PublishedNeed, 'ownerId' | 'field' | 'province'>;
export const needAudienceQuery = (
  need: PublishedNeed | NeedAudienceContext,
  now: Date,
) => Prisma.sql`
  SELECT s.owner_id AS "userId",s.field,s.province,s.intro,
    f.status AS "feeStatus",f.valid_until AS "validUntil",
    ARRAY(SELECT i.name FROM store_items i WHERE i.store_id=s.id ORDER BY i.sort,i.id) AS "productNames"
  FROM (
    SELECT s.id FROM stores s JOIN users u ON u.id=s.owner_id
      JOIN membership_fees f ON f.user_id=u.id
    WHERE s.status<>'hidden' AND s.owner_id<>${need.ownerId} AND u.deleted_at IS NULL
      AND u.account_type='business' AND (${usableFeeSql('f', now)} OR f.valid_until IS NULL)
      AND (s.field=${need.field} OR s.province=${need.province})
    ORDER BY s.id LIMIT 1000
  ) ids JOIN stores s ON s.id=ids.id JOIN membership_fees f ON f.user_id=s.owner_id ORDER BY s.id`;

@Injectable()
export class NeedMatchAudienceRepository {
  constructor(private readonly prisma: PrismaService) {}
  async need(id: string, now: Date) {
    return (
      (await this.prisma.db.$queryRaw<PublishedNeed[]>(publishedNeedQuery(id, now)))[0] ?? null
    );
  }
  audience(need: NeedAudienceContext, now: Date) {
    return this.prisma.db.$queryRaw<NeedAudience[]>(needAudienceQuery(need, now));
  }
  async claim(tx: DbTx, needId: string, userIds: string[]) {
    if (!userIds.length) return [];
    return tx.$queryRaw<{ userId: string }[]>`
      INSERT INTO need_match_notifications(need_id,user_id)
      SELECT ${needId},u.id FROM unnest(${userIds}::text[]) u(id)
      ON CONFLICT(need_id,user_id) DO NOTHING RETURNING user_id AS "userId"`;
  }
}
