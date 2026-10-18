import { Injectable } from '@nestjs/common';
import type { CampaignAudience } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface Recipient {
  id: string;
  email: string;
  fullName: string;
}

/** Loại tài khoản theo đối tượng; `groups` lọc theo group_members */
const ACCOUNT_TYPES: Record<Exclude<CampaignAudience, 'groups'>, string[] | null> = {
  all: null,
  business: ['business'],
  personal: ['personal', 'investor'],
};

/**
 * Người nhận chiến dịch — chỉ tài khoản `active`, chưa xoá, KHÔNG nằm trong `mail_suppressions`
 * (BUG-036: đã huỷ nhận; `NOT EXISTS` theo PK citext); keyset theo users_pkey.
 * Gửi theo lô keyset `id > cursor` (luật 5: không OFFSET trên bảng lớn).
 */
@Injectable()
export class AudienceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Ước tính (Q-B42-1): theo nhóm = tổng `groups.member_count` như prototype; còn lại đếm users */
  async estimate(audience: CampaignAudience, groupIds: readonly string[]): Promise<number> {
    if (audience === 'groups') {
      if (!groupIds.length) return 0;
      const r = await this.prisma.db.group.aggregate({
        where: { id: { in: [...groupIds] } },
        _sum: { memberCount: true },
      });
      return r._sum.memberCount ?? 0;
    }
    const types = ACCOUNT_TYPES[audience];
    const rows = await this.prisma.db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM users u
      WHERE u.status = 'active' AND u.deleted_at IS NULL
        AND (${types}::account_type[] IS NULL OR u.account_type = ANY(${types}::account_type[]))
        AND NOT EXISTS (SELECT 1 FROM mail_suppressions s WHERE s.email = u.email)`;
    return Number(rows[0]?.n ?? 0);
  }

  /** Một lô người nhận sau `cursor` (id tăng dần); theo nhóm thì loại trùng người ở nhiều nhóm */
  batch(
    audience: CampaignAudience,
    groupIds: readonly string[],
    cursor: string | null,
    size: number,
  ): Promise<Recipient[]> {
    const after = cursor ?? '';
    if (audience === 'groups') {
      return this.prisma.db.$queryRaw<Recipient[]>`
        SELECT u.id, u.email::text AS email, u.full_name AS "fullName" FROM users u
        WHERE u.status = 'active' AND u.deleted_at IS NULL AND u.id > ${after}
          AND NOT EXISTS (SELECT 1 FROM mail_suppressions s WHERE s.email = u.email)
          AND EXISTS (SELECT 1 FROM group_members gm
                      WHERE gm.user_id = u.id AND gm.status = 'member'
                        AND gm.group_id = ANY(${[...groupIds]}::text[]))
        ORDER BY u.id LIMIT ${size}`;
    }
    const types = ACCOUNT_TYPES[audience];
    return this.prisma.db.$queryRaw<Recipient[]>`
      SELECT u.id, u.email::text AS email, u.full_name AS "fullName" FROM users u
      WHERE u.status = 'active' AND u.deleted_at IS NULL AND u.id > ${after}
        AND (${types}::account_type[] IS NULL OR u.account_type = ANY(${types}::account_type[]))
        AND NOT EXISTS (SELECT 1 FROM mail_suppressions s WHERE s.email = u.email)
      ORDER BY u.id LIMIT ${size}`;
  }

  /**
   * `{{nhom}}` (V2Q-65): nhóm đầu tiên (tham gia sớm nhất) của mỗi người trong lô — một query cho cả
   * lô (luật 5), không query mỗi người.
   */
  async firstGroups(userIds: readonly string[]): Promise<Map<string, string>> {
    if (!userIds.length) return new Map();
    const rows = await this.prisma.db.$queryRaw<{ userId: string; name: string }[]>`
      SELECT DISTINCT ON (gm.user_id) gm.user_id AS "userId", g.name
      FROM group_members gm JOIN groups g ON g.id = gm.group_id
      WHERE gm.user_id = ANY(${[...userIds]}::text[]) AND gm.status = 'member'
      ORDER BY gm.user_id, gm.created_at, gm.group_id`;
    return new Map(rows.map((r) => [r.userId, r.name]));
  }

  /** Tên nhóm cho nhãn đối tượng — một query cho cả danh sách chiến dịch */
  async groupNames(ids: readonly string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.db.group.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((g) => [g.id, g.name]));
  }
}
