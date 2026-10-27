import { hash } from 'argon2';
import type { DbClient } from '../src/client';
import {
  ADMIN_ROLES,
  APP_SETTINGS,
  CATEGORIES,
  GENERAL_ROOM,
  GROUPS,
  INDUSTRY_GROUPS,
  MODERATION_KEYWORDS,
  SERVICES,
  SMTP_DEFAULT,
  SUPER_ADMIN,
} from './catalog';

/** Seed bắt buộc — upsert, chạy nhiều lần không đổi kết quả */
export async function seedRequired(db: DbClient, superAdminPassword: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.affiliatePolicy.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
    for (const g of GROUPS) {
      await tx.group.upsert({
        where: { id: g.id },
        create: {
          ...g,
          rooms: { create: { ...GENERAL_ROOM, id: `${g.id}-general`, isDefault: true } },
        },
        update: { name: g.name, region: g.region },
      });
    }
    // D-89: 56 nhóm ngành + phòng Chung — chỉ tạo khi thiếu (Admin sửa sau không bị ghi đè)
    await tx.group.createMany({ data: INDUSTRY_GROUPS, skipDuplicates: true });
    await tx.room.createMany({
      data: INDUSTRY_GROUPS.map((g) => ({
        ...GENERAL_ROOM,
        id: `${g.id}-general`,
        groupId: g.id,
        isDefault: true,
      })),
      skipDuplicates: true,
    });
    // Danh mục dịch vụ: chỉ tạo khi thiếu — Admin › Dịch vụ › Danh mục sửa sau không bị ghi đè
    for (const s of SERVICES) {
      await tx.service.upsert({ where: { id: s.id }, create: s, update: {} });
    }
    // Chỉ thêm lĩnh vực còn thiếu; trùng id hoặc trùng tên (DB cũ đổi id, D-89 v4) thì bỏ qua
    await tx.category.createMany({ data: CATEGORIES, skipDuplicates: true });
    for (const [key, value] of Object.entries(APP_SETTINGS)) {
      await tx.appSetting.upsert({
        where: { key },
        create: { key, value: value },
        update: {},
      });
    }
    // created_at tăng dần để giữ thứ tự hiển thị
    const base = Date.UTC(2026, 0, 1);
    await tx.moderationKeyword.createMany({
      data: MODERATION_KEYWORDS.map((word, i) => ({ word, createdAt: new Date(base + i * 1000) })),
      skipDuplicates: true,
    });
    await tx.smtpConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...SMTP_DEFAULT },
      update: {},
    });
  });
  await seedAdminRoles(db);
  await seedSuperAdmin(db, superAdminPassword);
}

/**
 * RB-R04 (TIP-V2-201): upsert 5 vai trò hệ thống theo `key`. Quyền mặc định CHỈ ghi khi vai trò
 * mới được tạo — chạy lại không ghi đè ma trận Admin đã sửa (NA-28).
 */
async function seedAdminRoles(db: DbClient): Promise<void> {
  await db.$transaction(async (tx) => {
    const existing = await tx.adminRole.findMany({
      where: { key: { in: ADMIN_ROLES.map((r) => r.key) } },
      select: { key: true },
    });
    const have = new Set(existing.map((r) => r.key));
    const missing = ADMIN_ROLES.filter((r) => !have.has(r.key));
    if (!missing.length) return;
    const created = await tx.adminRole.createManyAndReturn({
      data: missing.map((r) => ({
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: true,
      })),
      select: { id: true, key: true },
    });
    const idOf = new Map(created.map((r) => [r.key, r.id]));
    await tx.adminRolePermission.createMany({
      data: missing.flatMap((r) => {
        const roleId = idOf.get(r.key);
        return roleId ? r.permissions.map((permissionKey) => ({ roleId, permissionKey })) : [];
      }),
      skipDuplicates: true,
    });
  });
}

async function seedSuperAdmin(db: DbClient, password: string): Promise<void> {
  const [exists, admin] = await Promise.all([
    db.user.findUnique({ where: { id: SUPER_ADMIN.id }, select: { id: true } }),
    db.adminUser.findUnique({ where: { email: SUPER_ADMIN.email }, select: { id: true } }),
  ]);
  if (exists && admin) return;
  const passwordHash = await hash(password, { type: 2 });
  if (!admin) await seedSuperAdminAccount(db, passwordHash);
  if (exists) return;
  await db.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ code: string }[]>`
      SELECT 'TV' || lpad(nextval('member_code_seq')::text, 6, '0') AS code`;
    if (!row) throw new Error('Không sinh được mã thành viên');
    // D-52 (TIP-V2-202): đăng nhập ở `admin_users`; dòng `users` cùng id chỉ giữ cho FK (Admin làm
    // chủ nhóm D-15, nhật ký) — trạng thái "đã chuyển" như migration 20261019100000
    await tx.user.create({
      data: {
        id: SUPER_ADMIN.id,
        fullName: SUPER_ADMIN.fullName,
        email: `${SUPER_ADMIN.id}@moved.invalid`,
        memberCode: row.code,
        accountType: 'personal',
        systemRole: 'super_admin',
        passwordHash: null,
        emailVerifiedAt: new Date(),
        declaredAt: new Date(),
        deletedAt: new Date(),
      },
    });
  });
}

/**
 * D-52: Super Admin trong `admin_users` (cùng id `admin` với dòng `users` cũ — audit_logs.actor_id
 * giữ nghĩa). `must_change_pwd=false` vì mật khẩu do người vận hành đặt qua env.
 */
async function seedSuperAdminAccount(db: DbClient, passwordHash: string): Promise<void> {
  const role = await db.adminRole.findUniqueOrThrow({
    where: { key: 'super_admin' },
    select: { id: true },
  });
  await db.adminUser.create({
    data: {
      id: SUPER_ADMIN.id,
      name: SUPER_ADMIN.fullName,
      email: SUPER_ADMIN.email,
      roleId: role.id,
      passwordHash,
      mustChangePwd: false,
    },
  });
}
