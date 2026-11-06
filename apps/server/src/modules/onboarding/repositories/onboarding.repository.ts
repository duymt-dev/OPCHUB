import { Injectable } from '@nestjs/common';
import { type DbTx, Prisma } from '@opchub/db';
import type { OnboardingSnapshot } from '@opchub/shared';
import { usableFeeSql } from '@/common/auth';
import type { OnboardingFlag } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

interface SnapRow {
  id: string;
  account_type: 'business' | 'personal';
  paid: boolean;
  profile: boolean;
  grp: boolean;
  chat: boolean;
  store: boolean;
  project: boolean;
  need: boolean;
  explore: boolean;
  aff: boolean;
  event: boolean;
  fund: boolean;
}

/**
 * D-85: MỘT truy vấn cho cả lô thành viên — mỗi bước là EXISTS trên index theo người
 * (`group_members(user_id,status)`, `messages(sender_id)`, `stores(owner_id)` UQ, `projects(owner_id,…)`,
 * `needs(owner_id,…)`, `event_registrations(user_id,status)`, PK cờ / phí / hồ sơ DN).
 */
const SNAPSHOT = (ids: readonly string[]) => Prisma.sql`
  SELECT u.id, u.account_type,
    (${usableFeeSql('f', Prisma.sql`now()`)}) IS TRUE AS paid,
    CASE WHEN u.account_type = 'business'
      THEN u.avatar_url IS NOT NULL AND COALESCE(b.representative, '') <> ''
        AND COALESCE(b.tax_code, '') <> '' AND COALESCE(b.main_field, '') <> ''
      ELSE u.avatar_url IS NOT NULL AND u.registration_role IS NOT NULL
        AND cardinality(u.opc_intent) > 0 AND u.phone IS NOT NULL
    END AS profile,
    EXISTS (SELECT 1 FROM group_members g WHERE g.user_id = u.id AND g.status = 'member') AS grp,
    EXISTS (SELECT 1 FROM messages m WHERE m.sender_id = u.id AND NOT m.is_simulated
      AND m.deleted_at IS NULL) AS chat,
    EXISTS (SELECT 1 FROM stores s WHERE s.owner_id = u.id AND s.status <> 'hidden'
      AND (s.intro <> '' OR s.item_count > 0)) AS store,
    EXISTS (SELECT 1 FROM projects p WHERE p.owner_id = u.id AND p.deleted_at IS NULL) AS project,
    EXISTS (SELECT 1 FROM needs n WHERE n.owner_id = u.id) AS need,
    EXISTS (SELECT 1 FROM onboarding_flags o WHERE o.user_id = u.id AND o.key = 'explore') AS explore,
    EXISTS (SELECT 1 FROM onboarding_flags o WHERE o.user_id = u.id
      AND o.key = 'affiliate_share') AS aff,
    EXISTS (SELECT 1 FROM event_registrations e WHERE e.user_id = u.id
      AND e.status IN ('registered', 'attended')) AS event,
    EXISTS (SELECT 1 FROM project_fundraisings pf WHERE pf.owner_id = u.id
      AND pf.status IN ('pending_review', 'active')) AS fund
  FROM users u
  LEFT JOIN membership_fees f ON f.user_id = u.id
  LEFT JOIN business_profiles b ON b.user_id = u.id
  WHERE u.id IN (${Prisma.join([...ids])}) AND u.account_type IN ('business', 'personal')
    AND u.deleted_at IS NULL`;

const toSnapshot = (r: SnapRow): OnboardingSnapshot => ({
  accountType: r.account_type,
  paid: r.paid,
  profile: r.profile,
  group: r.grp,
  chat: r.chat,
  store: r.store,
  project: r.project,
  need: r.need,
  explore: r.explore,
  affiliateShare: r.aff,
  event: r.event,
  fundraising: r.fund,
});

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async snapshots(ids: readonly string[]): Promise<Map<string, OnboardingSnapshot>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.db.$queryRaw<SnapRow[]>(SNAPSHOT(ids));
    return new Map(rows.map((r) => [r.id, toSnapshot(r)]));
  }

  /** Ghi tiến độ cả lô bằng một câu (bộ lọc Admin "Đã / Chưa hoàn tất") */
  async saveProgress(done: ReadonlyMap<string, number>): Promise<void> {
    if (!done.size) return;
    const values = [...done].map(([id, n]) => Prisma.sql`(${id}, ${n}::smallint, now())`);
    await this.prisma.db.$executeRaw`
      INSERT INTO onboarding_progress (user_id, done, updated_at) VALUES ${Prisma.join(values)}
      ON CONFLICT (user_id) DO UPDATE SET done = EXCLUDED.done, updated_at = EXCLUDED.updated_at
      WHERE onboarding_progress.done IS DISTINCT FROM EXCLUDED.done`;
  }

  /** Cờ idempotent (PK user, key) — trả true nếu vừa ghi lần đầu */
  async setFlag(tx: DbTx, userId: string, key: OnboardingFlag): Promise<boolean> {
    const n = await tx.$executeRaw`
      INSERT INTO onboarding_flags (user_id, key) VALUES (${userId}, ${key}::onboarding_flag_key)
      ON CONFLICT (user_id, key) DO NOTHING`;
    return n > 0;
  }

  /** Keyset theo id cho sweep hằng ngày (Cá nhân / DN chưa xoá) */
  async memberIdsAfter(after: string, limit: number): Promise<string[]> {
    const rows = await this.prisma.db.$queryRaw<{ id: string }[]>`
      SELECT id FROM users WHERE id > ${after} AND account_type IN ('business', 'personal')
        AND deleted_at IS NULL ORDER BY id LIMIT ${limit}`;
    return rows.map((r) => r.id);
  }

  async hasProgress(): Promise<boolean> {
    const r = await this.prisma.db.onboardingProgress.findFirst({ select: { userId: true } });
    return r !== null;
  }

  /** Thành viên đã được Admin nhắc trong 24 giờ qua (D-88; lượt tự nhắc D-115 không tính) */
  async remindedSince(ids: readonly string[], since: Date): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const rows = await this.prisma.db.onboardingReminder.findMany({
      where: { userId: { in: [...ids] }, kind: 'admin', sentAt: { gt: since } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return new Set(rows.map((r) => r.userId));
  }
}
