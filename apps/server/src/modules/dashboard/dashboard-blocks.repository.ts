import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface MemberRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  position: string | null;
  company: string | null;
  account_type: string;
  country: string;
  last_at: Date | null;
  room_name: string | null;
  msgs: number;
}

export interface CountryRow {
  country: string;
  city: string;
  n: number;
}

export interface RecentRow {
  id: string;
  sender: string;
  avatar_url: string | null;
  group_id: string;
  group_name: string;
  body: string;
  created_at: Date;
}

export interface ThreadRow extends RecentRow {
  role: string;
  color: string;
  reply_name: string | null;
  reply_body: string | null;
  reply_count: number;
}

export interface SessionRow {
  title: string;
  starts_at: Date;
  ends_at: Date | null;
  registered_count: number;
}

/**
 * Khối Dashboard dựng từ dữ liệu thật (BUG-012, TD-010) — mỗi khối 1 query, kết quả cache 60 giây ở
 * service. Chỉ tin hiển thị (`hidden_at`/`deleted_at` null), không đọc nội dung tin riêng ngoài nhóm.
 */
@Injectable()
export class DashboardBlocksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Thành viên hoạt động gần nhất (tin 24h / đăng nhập), phòng gần nhất, số tin 7 ngày → điểm */
  members(limit: number): Promise<MemberRow[]> {
    return this.prisma.db.$queryRaw<MemberRow[]>`
      SELECT u.id, u.full_name, u.avatar_url, u.position, bp.company_name AS company,
             u.account_type::text, u.country,
             greatest(u.last_login_at, lm.created_at) AS last_at, lm.room_name,
             coalesce(cnt.n, 0)::int AS msgs
      FROM users u
      LEFT JOIN business_profiles bp ON bp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT m.created_at, r.name AS room_name FROM messages m
        JOIN rooms r ON r.id = m.room_id AND r.deleted_at IS NULL
        WHERE m.sender_id = u.id AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC LIMIT 1
      ) lm ON true
      LEFT JOIN LATERAL (
        SELECT count(*) AS n FROM messages m
        WHERE m.sender_id = u.id AND m.created_at > now() - interval '7 days'
      ) cnt ON true
      WHERE u.deleted_at IS NULL AND u.status = 'active' AND u.system_role = 'member'
      ORDER BY greatest(u.last_login_at, lm.created_at) DESC NULLS LAST, u.created_at DESC
      LIMIT ${limit}`;
  }

  /** Thành viên theo quốc gia + tỉnh/thành (`users.country`, `users.city`) */
  countries(): Promise<CountryRow[]> {
    return this.prisma.db.$queryRaw<CountryRow[]>`
      SELECT country, city, count(*)::int AS n FROM users
      WHERE deleted_at IS NULL AND status = 'active' AND system_role = 'member'
      GROUP BY country, city ORDER BY country, n DESC`;
  }

  /** Tin chữ mới nhất trong các nhóm (BRIN created_at) */
  recent(limit: number): Promise<RecentRow[]> {
    return this.prisma.db.$queryRaw<RecentRow[]>`
      SELECT m.id, coalesce(u.full_name, p.name) AS sender, coalesce(u.avatar_url, p.avatar_url) AS avatar_url,
             g.id AS group_id, g.name AS group_name, m.body, m.created_at
      FROM messages m
      JOIN rooms r ON r.id = m.room_id AND r.deleted_at IS NULL
      JOIN groups g ON g.id = r.group_id AND g.deleted_at IS NULL
      LEFT JOIN users u ON u.id = m.sender_id
      LEFT JOIN personas p ON p.id = m.persona_id
      WHERE m.kind = 'text' AND m.hidden_at IS NULL AND m.deleted_at IS NULL
        AND (m.sender_id IS NOT NULL OR m.persona_id IS NOT NULL)
        AND m.created_at > now() - interval '30 days'
      ORDER BY m.created_at DESC LIMIT ${limit}`;
  }

  /** Phiên trong ngày (giờ VN) = sự kiện bắt đầu hôm nay */
  sessions(from: Date, to: Date): Promise<SessionRow[]> {
    return this.prisma.db.$queryRaw<SessionRow[]>`
      SELECT title, starts_at, ends_at, registered_count FROM events
      WHERE starts_at >= ${from} AND starts_at < ${to}
      ORDER BY starts_at LIMIT 6`;
  }
}
