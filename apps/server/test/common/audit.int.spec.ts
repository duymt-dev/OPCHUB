import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuditService } from '@/common/audit';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('audit (TIP-B03)', () => {
  let t: TestApp;
  let audit: AuditService;

  beforeAll(async () => {
    t = await createTestApp();
    audit = t.app.get(AuditService);
  });
  afterAll(async () => {
    await t.close();
  });

  it('ghi 1 dòng trong transaction, có ip + diff', async () => {
    const entityId = `e-${Date.now()}`;
    await t.prisma.db.$transaction((tx) =>
      audit.log(tx, {
        actorId: null,
        action: 'user.lock',
        entity: 'user',
        entityId,
        tag: 'member',
        summary: 'khoá tài khoản',
        diff: { status: ['active', 'locked'] },
        ip: '127.0.0.1',
      }),
    );
    const rows = await t.prisma.db.auditLog.findMany({ where: { entityId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ip).toBe('127.0.0.1');
  });

  it('rollback thì không ghi', async () => {
    const entityId = `r-${Date.now()}`;
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        await audit.log(tx, {
          actorId: null,
          action: 'fee.collect',
          entity: 'user',
          entityId,
          tag: 'member',
          summary: 'x',
        });
        throw new Error('rollback');
      }),
    ).rejects.toThrow();
    expect(await t.prisma.db.auditLog.count({ where: { entityId } })).toBe(0);
  });

  it('action sai định dạng bị chặn', async () => {
    await expect(
      t.prisma.db.$transaction((tx) =>
        audit.log(tx, {
          actorId: null,
          action: 'LockUser',
          entity: 'user',
          entityId: 'x',
          tag: 'member',
          summary: 'x',
        }),
      ),
    ).rejects.toThrow();
  });

  it('không có API sửa/xoá', () => {
    const proto = Object.getOwnPropertyNames(AuditService.prototype);
    expect(proto.filter((n) => /update|delete|remove/i.test(n))).toEqual([]);
  });
});
