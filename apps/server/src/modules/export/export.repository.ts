import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface UserExportRow {
  id: string;
  member_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  account_type: string;
  system_role: string;
  status: string;
  company: string | null;
  tax_code: string | null;
  created_at: Date;
}

export interface MemberExportRow {
  key: string;
  group_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  account_type: string;
  company: string | null;
  tax_code: string | null;
  group_role: string;
  country: string;
  joined_at: Date;
  status: string;
}

/**
 * Đọc dữ liệu xuất theo LÔ keyset (luật 5) — worker gọi lặp tới khi hết, không OFFSET.
 * Chỉ đọc; bảng thuộc domain account/community.
 */
@Injectable()
export class ExportRepository {
  constructor(private readonly prisma: PrismaService) {}

  users(userIds: readonly string[] | undefined, after: string, size: number) {
    const only = userIds?.length
      ? Prisma.sql`AND u.id = ANY(${[...userIds]}::text[])`
      : Prisma.empty;
    return this.prisma.db.$queryRaw<UserExportRow[]>`
      SELECT u.id, u.member_code, u.full_name, u.email::text AS email, u.phone,
             u.account_type::text, u.system_role::text, u.status::text,
             b.company_name AS company, b.tax_code, u.created_at
      FROM users u LEFT JOIN business_profiles b ON b.user_id = u.id
      WHERE u.deleted_at IS NULL AND u.system_role <> 'super_admin' AND u.id > ${after} ${only}
      ORDER BY u.id LIMIT ${size}`;
  }

  /** Khoá keyset = group_id|user_id (PK group_members) */
  members(
    groupIds: readonly string[],
    status: 'active' | 'locked' | null,
    after: { groupId: string; userId: string },
    size: number,
  ) {
    const byStatus = status ? Prisma.sql`AND u.status = ${status}::user_status` : Prisma.empty;
    return this.prisma.db.$queryRaw<MemberExportRow[]>`
      SELECT gm.group_id || '|' || gm.user_id AS key, g.name AS group_name, u.full_name,
             u.email::text AS email, u.phone, u.account_type::text, b.company_name AS company,
             b.tax_code, gm.group_role::text, COALESCE(b.country, u.country) AS country,
             gm.created_at AS joined_at, u.status::text
      FROM group_members gm
      JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
      JOIN users u ON u.id = gm.user_id AND u.deleted_at IS NULL
      LEFT JOIN business_profiles b ON b.user_id = u.id
      WHERE gm.group_id = ANY(${[...groupIds]}::text[]) AND gm.status = 'member' ${byStatus}
        AND (gm.group_id, gm.user_id) > (${after.groupId}, ${after.userId})
      ORDER BY gm.group_id, gm.user_id LIMIT ${size}`;
  }
}
