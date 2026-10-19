import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HousekeepingService, SystemCoreModule } from '@/modules/system';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** NA-13 / BR-13: nhật ký thao tác giữ ≥ 12 tháng, không xoá từ giao diện, job không đụng */
describe('Lưu giữ audit_logs (NA-13, BR-13)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ imports: [SystemCoreModule] });
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.close();
  });

  it('REQ-213 job dọn dữ liệu không đổi số dòng audit_logs', async () => {
    const before = await t.prisma.db.auditLog.count();
    const oldest = await t.prisma.db.auditLog.findFirst({ orderBy: { createdAt: 'asc' } });
    await t.app.get(HousekeepingService).run(new Date(Date.now() + 400 * 86_400_000));
    expect(await t.prisma.db.auditLog.count()).toBeGreaterThanOrEqual(before);
    if (oldest) {
      expect(await t.prisma.db.auditLog.findUnique({ where: { id: oldest.id } })).not.toBeNull();
    }
  });

  it('REQ-213 test âm: DELETE / UPDATE trực tiếp audit_logs bị trigger chặn', async () => {
    const row = await t.prisma.db.auditLog.create({
      data: { action: 'test.retention', entity: 'test', entityId: 'audit-retention' },
    });
    await expect(
      t.prisma.db.$executeRaw`DELETE FROM audit_logs WHERE id = ${row.id}`,
    ).rejects.toThrow(/INSERT/);
    await expect(
      t.prisma.db.$executeRaw`UPDATE audit_logs SET summary = 'x' WHERE id = ${row.id}`,
    ).rejects.toThrow(/INSERT/);
    expect(await t.prisma.db.auditLog.findUnique({ where: { id: row.id } })).not.toBeNull();
  });

  it('REQ-213 không có route xoá nhật ký (Super Admin cũng 404)', async () => {
    const owner = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
    for (const path of ['/admin/audit-logs', '/admin/audit-logs/x']) {
      expect((await t.call(path, { method: 'DELETE', token: owner })).status).toBe(404);
    }
  });
});
