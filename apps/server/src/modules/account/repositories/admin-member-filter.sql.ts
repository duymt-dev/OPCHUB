import type { AdminMemberFilter } from '@opchub/shared/api-domains';
import { PAID_FEE_STATUS, EXEMPT_FEE_STATUS } from '@opchub/shared';
import { Prisma } from '@opchub/db';
import { containsPattern } from '@/common/prisma/like';

const DAY_MS = 86_400_000;

/**
 * Điều kiện WHERE cho màn Thành viên — thanh lọc v4 (`_mfVals`, D-89).
 * Mỗi điều kiện liên bảng là `EXISTS` trên khoá chính / index sẵn có (không join nhân dòng):
 * nhóm `group_members (user_id, status)`, phí `membership_fees` PK `user_id`,
 * hồ sơ DN `business_profiles` PK `user_id`, khởi đầu `onboarding_progress` PK `user_id`.
 */
export function adminMemberWhere(f: AdminMemberFilter, now: Date): Prisma.Sql {
  const conds: Prisma.Sql[] = [
    f.type
      ? Prisma.sql`account_type = ${f.type}::account_type`
      : Prisma.sql`account_type IN ('personal', 'business')`,
    Prisma.sql`deleted_at IS NULL`,
  ];
  const q = f.q?.trim();
  if (q)
    conds.push(Prisma.sql`(immutable_unaccent(full_name) || ' ' || email::text)
      ILIKE immutable_unaccent(${containsPattern(q)})`);
  // V4-611: chưa có dòng tiến độ = chưa hoàn tất
  if (f.onboarding) {
    const done = Prisma.sql`EXISTS (SELECT 1 FROM onboarding_progress op
      WHERE op.user_id = users.id AND op.done = 8)`;
    conds.push(f.onboarding === 'done' ? done : Prisma.sql`NOT ${done}`);
  }
  if (f.group)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM group_members gm
      WHERE gm.user_id = users.id AND gm.status = 'member' AND gm.group_id = ${f.group})`);
  // "Doanh nghiệp" là vai trò hiển thị của TK doanh nghiệp (toAdminMember.persona)
  if (f.role)
    conds.push(
      f.role === 'business'
        ? Prisma.sql`account_type = 'business'`
        : Prisma.sql`account_type = 'personal' AND registration_role = ${f.role}`,
    );
  // D-107: Đã đóng phí = phí thật đang hiệu lực (không gồm trial); Miễn phí 3 tháng = trial;
  // Chưa đóng / Hết hạn = còn lại (gồm TV chưa có dòng phí)
  if (f.fee) {
    const has = (s: readonly string[]) => Prisma.sql`EXISTS (SELECT 1 FROM membership_fees mf
      WHERE mf.user_id = users.id AND mf.status = ANY(${[...s]}::membership_fee_status[]))`;
    if (f.fee === 'paid') conds.push(has(PAID_FEE_STATUS));
    else if (f.fee === 'trial') conds.push(has(['trial']));
    else conds.push(Prisma.sql`NOT ${has([...PAID_FEE_STATUS, 'trial', ...EXEMPT_FEE_STATUS])}`);
  }
  if (f.status) conds.push(Prisma.sql`status = ${f.status}::user_status`);
  // Hồ sơ chưa khai báo (V4-607): chưa qua popup khai báo, hoặc DN chưa có MST
  if (f.profile) {
    const inc = Prisma.sql`(declared_at IS NULL OR (account_type = 'business' AND NOT EXISTS (
      SELECT 1 FROM business_profiles bp WHERE bp.user_id = users.id AND bp.tax_code <> '')))`;
    conds.push(f.profile === 'inc' ? inc : Prisma.sql`NOT ${inc}`);
  }
  if (f.days) conds.push(Prisma.sql`created_at >= ${new Date(now.getTime() - f.days * DAY_MS)}`);
  return Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}`;
}
