import { hash } from 'argon2';
import type { DbClient } from '../src/client';
import {
  APP_SETTINGS,
  CATEGORIES,
  GENERAL_ROOM,
  GROUPS,
  ROLE_PERMISSIONS,
  SMTP_DEFAULT,
  SUPER_ADMIN,
} from './catalog';

/** Seed bắt buộc — upsert, chạy nhiều lần không đổi kết quả */
export async function seedRequired(db: DbClient, superAdminPassword: string): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const g of GROUPS) {
      await tx.group.upsert({
        where: { id: g.id },
        create: {
          ...g,
          rooms: { create: { ...GENERAL_ROOM, id: `${g.id}-general`, isDefault: true } },
        },
        update: { name: g.name, region: g.region, joinMode: g.joinMode },
      });
    }
    for (const c of CATEGORIES) {
      await tx.category.upsert({ where: { id: c.id }, create: c, update: {} });
    }
    for (const r of ROLE_PERMISSIONS) {
      await tx.rolePermission.upsert({ where: { role: r.role }, create: r, update: {} });
    }
    for (const [key, value] of Object.entries(APP_SETTINGS)) {
      await tx.appSetting.upsert({
        where: { key },
        create: { key, value: value },
        update: {},
      });
    }
    await tx.smtpConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...SMTP_DEFAULT },
      update: {},
    });
  });
  await seedSuperAdmin(db, superAdminPassword);
}

async function seedSuperAdmin(db: DbClient, password: string): Promise<void> {
  const exists = await db.user.findUnique({
    where: { email: SUPER_ADMIN.email },
    select: { id: true },
  });
  if (exists) return;
  const passwordHash = await hash(password, { type: 2 });
  await db.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ code: string }[]>`
      SELECT 'TV' || lpad(nextval('member_code_seq')::text, 6, '0') AS code`;
    if (!row) throw new Error('Không sinh được mã thành viên');
    await tx.user.create({
      data: {
        ...SUPER_ADMIN,
        memberCode: row.code,
        accountType: 'personal',
        systemRole: 'super_admin',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
  });
}
