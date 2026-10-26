import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

/** Kỳ báo cáo: [start, end) theo giờ VN, dạng UTC */
export interface ReportPeriod {
  start: Date;
  end: Date;
  monthKey: string;
}

/** Số liệu một nhóm trong kỳ — cộng theo phạm vi ở service (người trùng nhiều nhóm đếm distinct ở SQL) */
export interface GroupScopeRow {
  id: string;
  name: string;
  province: string;
  owner: string;
}

export interface ScopeTotals {
  newMembers: number;
  newPaidMembers: number;
  totalMembers: number;
  activeMembers: number;
  events: number;
  topics: number;
  feeRevenue: number;
  commission: number;
  fundraisingRevenue: number;
}

export interface PerGroupRow {
  group_id: string;
  members: number;
  messages: number;
}

export interface PerProvinceRow {
  province: string;
  new_members: number;
  total_members: number;
  events: number;
  fee_revenue: number;
}

/**
 * Tổng hợp Báo cáo B1/B2/B3 (V4-614, D-78) — chỉ đọc, không bảng mới. Mỗi hàm MỘT truy vấn cho cả
 * phạm vi (danh sách nhóm), không lặp theo tỉnh / nhóm. Thành viên của phạm vi = người đang ở
 * (`status = member`) ít nhất một nhóm của phạm vi, đếm distinct.
 */
@Injectable()
export class ReportMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.db;
  }

  /** Nhóm chưa xoá của phạm vi + chủ nhóm (một dòng / nhóm) */
  groups(where: Prisma.Sql): Promise<GroupScopeRow[]> {
    return this.db.$queryRaw<GroupScopeRow[]>`
      SELECT g.id, g.name, g.province,
        COALESCE((SELECT u.full_name FROM group_members gm JOIN users u ON u.id = gm.user_id
          WHERE gm.group_id = g.id AND gm.status = 'member' AND gm.group_role = 'owner'
          ORDER BY gm.created_at LIMIT 1), '') AS owner
      FROM groups g
      WHERE g.deleted_at IS NULL AND ${where}
      ORDER BY g.member_count DESC, g.name`;
  }

  /** Mọi số liệu tổng của phạm vi trong kỳ — một truy vấn (CTE thành viên dùng chung) */
  async totals(groupIds: readonly string[], p: ReportPeriod): Promise<ScopeTotals> {
    const ids = [...groupIds];
    const rows = await this.db.$queryRaw<Record<keyof ScopeTotals, bigint | number | null>[]>`
      WITH mem AS (
        SELECT DISTINCT user_id FROM group_members
        WHERE group_id = ANY(${ids}::text[]) AND status = 'member' AND created_at < ${p.end}
      )
      SELECT
        (SELECT count(DISTINCT user_id) FROM group_members
          WHERE group_id = ANY(${ids}::text[]) AND status = 'member'
            AND created_at >= ${p.start} AND created_at < ${p.end}) AS "newMembers",
        (SELECT count(DISTINCT fp.user_id) FROM membership_fee_periods fp JOIN mem USING (user_id)
          WHERE fp.created_at >= ${p.start} AND fp.created_at < ${p.end}) AS "newPaidMembers",
        (SELECT count(*) FROM mem) AS "totalMembers",
        (SELECT count(*) FROM membership_fees f JOIN mem USING (user_id)
          WHERE f.paid_at < ${p.end} AND f.valid_until > ${p.start}) AS "activeMembers",
        (SELECT count(*) FROM events e
          WHERE e.group_id = ANY(${ids}::text[])
            AND e.starts_at >= ${p.start} AND e.starts_at < ${p.end}) AS "events",
        (SELECT count(*) FROM rooms r
          WHERE r.group_id = ANY(${ids}::text[]) AND NOT r.is_default
            AND r.created_at >= ${p.start} AND r.created_at < ${p.end}) AS "topics",
        (SELECT COALESCE(sum(fp.amount), 0) FROM membership_fee_periods fp JOIN mem USING (user_id)
          WHERE fp.created_at >= ${p.start} AND fp.created_at < ${p.end}) AS "feeRevenue",
        (SELECT COALESCE(sum(c.amount), 0) FROM commissions c
          JOIN mem ON mem.user_id = c.referred_user_id
          WHERE c.month_key = ${p.monthKey} AND c.status <> 'cancelled') AS "commission",
        (SELECT COALESCE(sum(pf.amount), 0) FROM project_fundraisings pf
          JOIN mem ON mem.user_id = pf.owner_id
          WHERE pf.paid_at >= ${p.start} AND pf.paid_at < ${p.end}) AS "fundraisingRevenue"`;
    const r = rows[0];
    const n = (k: keyof ScopeTotals) => Number(r?.[k] ?? 0);
    return {
      newMembers: n('newMembers'),
      newPaidMembers: n('newPaidMembers'),
      totalMembers: n('totalMembers'),
      activeMembers: n('activeMembers'),
      events: n('events'),
      topics: n('topics'),
      feeRevenue: n('feeRevenue'),
      commission: n('commission'),
      fundraisingRevenue: n('fundraisingRevenue'),
    };
  }

  /** B2 khối C — thành viên + tin nhắn thành viên gửi trong kỳ, một dòng / nhóm */
  perGroup(groupIds: readonly string[], p: ReportPeriod): Promise<PerGroupRow[]> {
    const ids = [...groupIds];
    return this.db.$queryRaw<PerGroupRow[]>`
      SELECT g.id AS group_id,
        (SELECT count(*)::int FROM group_members gm
          WHERE gm.group_id = g.id AND gm.status = 'member' AND gm.created_at < ${p.end}) AS members,
        (SELECT count(*)::int FROM messages m JOIN rooms r ON r.id = m.room_id
          WHERE r.group_id = g.id AND m.sender_id IS NOT NULL AND NOT m.is_simulated
            AND m.deleted_at IS NULL AND m.created_at >= ${p.start} AND m.created_at < ${p.end}) AS messages
      FROM groups g WHERE g.id = ANY(${ids}::text[])`;
  }

  /** B3 — một dòng / tỉnh của vùng (thành viên distinct trong tỉnh); gom `GROUP BY province` một lượt */
  perProvince(groupIds: readonly string[], p: ReportPeriod): Promise<PerProvinceRow[]> {
    const ids = [...groupIds];
    return this.db.$queryRaw<PerProvinceRow[]>`
      WITH g AS (SELECT id, province FROM groups WHERE id = ANY(${ids}::text[])),
      mem AS (
        SELECT g.province, gm.user_id, min(gm.created_at) AS first_at
        FROM group_members gm JOIN g ON g.id = gm.group_id
        WHERE gm.status = 'member' AND gm.created_at < ${p.end}
        GROUP BY g.province, gm.user_id
      ),
      cnt AS (
        SELECT province, count(*)::int AS total_members,
          (count(*) FILTER (WHERE first_at >= ${p.start}))::int AS new_members
        FROM mem GROUP BY province
      ),
      fee AS (
        SELECT mem.province, sum(fp.amount)::bigint AS amount
        FROM mem JOIN membership_fee_periods fp ON fp.user_id = mem.user_id
        WHERE fp.created_at >= ${p.start} AND fp.created_at < ${p.end}
        GROUP BY mem.province
      ),
      ev AS (
        SELECT g.province, count(*)::int AS n FROM events e JOIN g ON g.id = e.group_id
        WHERE e.starts_at >= ${p.start} AND e.starts_at < ${p.end}
        GROUP BY g.province
      )
      SELECT pr.province,
        COALESCE(cnt.new_members, 0) AS new_members,
        COALESCE(cnt.total_members, 0) AS total_members,
        COALESCE(ev.n, 0) AS events,
        COALESCE(fee.amount, 0)::bigint AS fee_revenue
      FROM (SELECT DISTINCT province FROM g) pr
      LEFT JOIN cnt ON cnt.province = pr.province
      LEFT JOIN ev ON ev.province = pr.province
      LEFT JOIN fee ON fee.province = pr.province
      ORDER BY pr.province`;
  }
}
