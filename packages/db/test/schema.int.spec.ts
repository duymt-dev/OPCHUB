import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { seedRequired } from '../seed/required';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });
const PASSWORD = 'Test-Password-123';

describe('schema core + seed bắt buộc', () => {
  beforeAll(async () => {
    await seedRequired(db, PASSWORD);
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it('seed chạy lần 2 không đổi số dòng', async () => {
    const count = async () => [
      await db.group.count(),
      await db.adminRole.count({ where: { isSystem: true } }),
      await db.category.count(),
      await db.user.count({ where: { systemRole: 'super_admin' } }),
    ];
    const before = await count();
    await seedRequired(db, PASSWORD);
    const after = await count();
    expect(after).toEqual(before);
    // D-89: 34 nhóm tỉnh + 56 nhóm ngành
    expect(after.slice(0, 2)).toEqual([90, 5]);
  });

  it('mỗi nhóm có phòng general mặc định', async () => {
    expect(await db.room.count({ where: { slug: 'general', isDefault: true } })).toBe(90);
  });

  it('audit_logs chặn UPDATE và DELETE', async () => {
    const row = await db.auditLog.create({
      data: { action: 'test.insert', entity: 'test', entityId: '1' },
    });
    await expect(
      db.auditLog.update({ where: { id: row.id }, data: { action: 'x' } }),
    ).rejects.toThrow();
    await expect(db.auditLog.delete({ where: { id: row.id } })).rejects.toThrow();
  });

  it('enum chặn trạng thái phí sai', async () => {
    // D-52: TK quản trị ở `admin_users`; phí gắn thành viên → dùng một thành viên bất kỳ
    const admin = await db.user.findFirstOrThrow({ where: { deletedAt: null } });
    await expect(
      db.$executeRaw`INSERT INTO membership_fees (user_id, status, amount, updated_at)
        VALUES (${admin.id}, 'paid'::membership_fee_status, 1200000, now())`,
    ).rejects.toThrow();
  });

  it('thu tay phải có lý do (D-41)', async () => {
    // D-52: TK quản trị ở `admin_users`; phí gắn thành viên → dùng một thành viên bất kỳ
    const admin = await db.user.findFirstOrThrow({ where: { deletedAt: null } });
    await expect(
      db.membershipFeePeriod.create({
        data: {
          userId: admin.id,
          startsAt: new Date(),
          endsAt: new Date(),
          amount: 600000,
          source: 'manual',
        },
      }),
    ).rejects.toThrow();
  });

  it('index users_list là covering + partial', async () => {
    const rows = await db.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'users_list'`;
    expect(rows[0]?.indexdef).toMatch(
      /INCLUDE \(id, full_name, email, status\) WHERE \(deleted_at IS NULL\)/,
    );
  });
});
