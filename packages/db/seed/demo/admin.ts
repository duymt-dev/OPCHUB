import { ADMIN_SYSTEM_ROLES, DEFAULT_ADMIN_ROLE_PERMISSIONS } from '@opchub/shared';
import { ADMIN_PHOTO, avatarUrl, DAY_MS, MOCK_NOW } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';
import { ADMIN_ID } from './people';

/**
 * Domain admin-account (TIP-V2-201, D-52): 6 TK quản trị theo `stAdmins` prototype ver2 —
 * Super Admin `admin` (seed bắt buộc, chỉ cập nhật) + 5 nhân sự. Mật khẩu demo như Admin
 * (Admin@2026), `must_change_pwd=false` để e2e đăng nhập thẳng (TIP-V2-202).
 * 2FA: seed không có DATA_ENC_KEY nên không mã hoá được TOTP → mọi TK demo "Chưa bật" (V2Q-114).
 */

const MIN_MS = 60_000;

interface DemoAdmin {
  id: string;
  name: string;
  email: string;
  roleKey: 'admin' | 'lecturer' | 'accountant' | 'editor';
  /** Lần đăng nhập gần nhất trước MOCK_NOW (prototype: "10 phút trước", "Hôm qua"…) */
  lastLoginAgo: number;
}

export const DEMO_ADMINS: readonly DemoAdmin[] = [
  {
    id: 'adm-trang',
    name: 'Phạm Thu Trang',
    email: 'trang.pham@opchub.community',
    roleKey: 'admin',
    lastLoginAgo: 10 * MIN_MS,
  },
  {
    id: 'adm-yen',
    name: 'Đỗ Hải Yến',
    email: 'yen.do@opchub.community',
    roleKey: 'lecturer',
    lastLoginAgo: DAY_MS + 60 * MIN_MS,
  },
  {
    id: 'adm-quan',
    name: 'Vũ Minh Quân',
    email: 'quan.vu@opchub.community',
    roleKey: 'lecturer',
    lastLoginAgo: 3 * DAY_MS + 60 * MIN_MS,
  },
  {
    id: 'adm-mai',
    name: 'Hoàng Thị Mai',
    email: 'mai.hoang@opchub.community',
    roleKey: 'accountant',
    lastLoginAgo: 2 * 60 * MIN_MS,
  },
  {
    id: 'adm-hang',
    name: 'Ngô Thu Hằng',
    email: 'hang.ngo@opchub.community',
    roleKey: 'editor',
    lastLoginAgo: DAY_MS + 2 * 60 * MIN_MS,
  },
];

/** Vai trò hệ thống về tên/mô tả + ma trận mặc định §21.2 (demo là mốc cố định — khác seed bắt buộc) */
async function resetSystemRoles(tx: DbTx): Promise<Map<string, string>> {
  const roles = await tx.adminRole.findMany({
    where: { key: { in: ADMIN_SYSTEM_ROLES.map((r) => r.key) } },
    select: { id: true, key: true },
  });
  const idOf = new Map(roles.flatMap((r) => (r.key ? [[r.key, r.id] as const] : [])));
  if (idOf.size !== ADMIN_SYSTEM_ROLES.length) {
    throw new Error('Seed demo: thiếu vai trò hệ thống (chạy seed bắt buộc trước)');
  }
  await tx.$executeRaw`
    UPDATE admin_roles r SET name = x.name, description = x.description, is_system = true,
      updated_at = now()
    FROM unnest(${ADMIN_SYSTEM_ROLES.map((r) => r.key)}::text[],
                ${ADMIN_SYSTEM_ROLES.map((r) => r.name)}::text[],
                ${ADMIN_SYSTEM_ROLES.map((r) => r.description)}::text[]) AS x(key, name, description)
    WHERE r.key = x.key`;
  await tx.adminRolePermission.deleteMany({ where: { roleId: { in: [...idOf.values()] } } });
  await tx.adminRolePermission.createMany({
    data: Object.entries(DEFAULT_ADMIN_ROLE_PERMISSIONS).flatMap(([key, perms]) => {
      const roleId = idOf.get(key);
      return roleId ? perms.map((permissionKey) => ({ roleId, permissionKey })) : [];
    }),
  });
  return idOf;
}

export async function seedAdmins(tx: DbTx, adminHash: string): Promise<void> {
  const idOf = await resetSystemRoles(tx);
  const roleOf = (key: string) => {
    const id = idOf.get(key);
    if (!id) throw new Error(`Seed demo: không có vai trò ${key}`);
    return id;
  };
  await tx.adminUser.update({
    where: { id: ADMIN_ID },
    data: {
      roleId: roleOf('super_admin'),
      passwordHash: adminHash,
      mustChangePwd: false,
      totpSecretEnc: null,
      status: 'active',
      deletedAt: null,
      lastLoginAt: new Date(MOCK_NOW),
      avatarUrl: avatarUrl(ADMIN_PHOTO.admin),
      // Đứng đầu danh sách (created_at ASC) như prototype
      createdAt: new Date(MOCK_NOW - 60 * DAY_MS),
      permVersion: { increment: 1 },
    },
  });
  await tx.adminUser.createMany({
    data: DEMO_ADMINS.map((a, i) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      avatarUrl: avatarUrl(ADMIN_PHOTO[a.id]),
      roleId: roleOf(a.roleKey),
      passwordHash: adminHash,
      mustChangePwd: false,
      lastLoginAt: new Date(MOCK_NOW - a.lastLoginAgo),
      createdBy: ADMIN_ID,
      // Thứ tự liệt kê (created_at ASC) = thứ tự prototype
      createdAt: new Date(MOCK_NOW - 30 * DAY_MS + i * MIN_MS),
    })),
  });
}
