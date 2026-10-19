import { randomUUID } from 'node:crypto';
import type { TestApp } from '../setup/test-app';

/** Id vai trò hệ thống theo `key` (migration TIP-V2-201 đã seed 5 vai trò) */
export async function roleIds(t: TestApp): Promise<Record<string, string>> {
  const rows = await t.prisma.db.adminRole.findMany({
    where: { key: { not: null } },
    select: { id: true, key: true },
  });
  return Object.fromEntries(rows.map((r) => [r.key ?? '', r.id]));
}

export const uniqueAdminEmail = () => `qt-${randomUUID().slice(0, 8)}@noibo.opchub.vn`;

/**
 * Dọn dữ liệu test: TK quản trị test tạo + bản sao migration TIP-V2-201 của user factory
 * (`u-…@test.opchub.vn` có system_role ≠ member) — để danh sách (≤ 200 dòng) không bị lấp đầy.
 */
export async function cleanupAdminAccounts(t: TestApp): Promise<void> {
  await t.prisma.db.adminUser.deleteMany({
    where: {
      OR: [{ email: { endsWith: '@noibo.opchub.vn' } }, { email: { endsWith: '@test.opchub.vn' } }],
    },
  });
  await t.prisma.db.adminRole.deleteMany({
    where: { isSystem: false, name: { startsWith: 'Thử ' } },
  });
}
