import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuditService } from '@/common/audit';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { InvestorAdminRepository } from '@/modules/investor/repositories/investor-admin.repository';
import { AdminFeesRepository } from '@/modules/membership-fee/repositories/admin-fees.repository';
import { createEvent, removeTestEvents } from '../factories/event.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * BUG-039 (CR-30): 4 xuất CSV đồng bộ đọc dữ liệu + ghi audit trong CÙNG transaction —
 * audit lỗi thì không trả file (luật 10, BR-13).
 */
describe('Xuất CSV đồng bộ + audit (TIP-V2-109)', () => {
  let t: TestApp;
  let admin: string;
  let memberId: string;
  let eventId: string;

  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    memberId = (await createUser(t, { fee: 'active' })).id;
    eventId = (await createEvent(t)).id;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  afterAll(async () => {
    await removeTestEvents(t);
    await t.close();
  });

  type Repo = Record<string, (...args: unknown[]) => unknown>;
  type Read = [Repo, string];
  const repo = (cls: new (...a: never[]) => object): Repo => t.app.get<object, Repo>(cls);
  const endpoints = (): {
    name: string;
    path: string;
    json?: Record<string, unknown>;
    read?: Read;
  }[] => [
    {
      name: 'nhà đầu tư',
      path: '/admin/investors/export',
      json: {},
      read: [repo(InvestorAdminRepository), 'all'],
    },
    {
      name: 'đăng ký sự kiện',
      path: `/admin/events/${eventId}/registrations/export`,
      read: [repo(EventRepository), 'registrants'],
    },
    {
      name: 'phí thành viên',
      path: '/admin/fees/export',
      json: { userIds: [memberId] },
      read: [repo(AdminFeesRepository), 'byUserIds'],
    },
    { name: 'yêu cầu dịch vụ', path: '/admin/service-requests/export' },
  ];
  const post = (path: string, json?: Record<string, unknown>) =>
    t.call(path, { method: 'POST', token: admin, ...(json ? { json } : {}) });

  it('BUG-039 BR-13 xuất CSV đồng bộ: audit cùng transaction', async () => {
    const audit = t.app.get(AuditService);
    for (const ep of endpoints()) {
      // Đường xanh: có CSV, audit nhận tx của transaction (không phải client gốc)
      const ok = vi.spyOn(audit, 'log');
      // Dữ liệu xuất phải đọc qua `tx` (đối số cuối của repo), không qua client gốc
      const reads = ep.read ? vi.spyOn(ep.read[0], ep.read[1]) : null;
      const findBase = vi.spyOn(t.prisma.db.serviceRequest, 'findMany');
      const res = await post(ep.path, ep.json);
      expect(res.status, ep.name).toBe(200);
      expect(((await res.json()) as { csv?: string }).csv, ep.name).toBeTypeOf('string');
      expect(ok, ep.name).toHaveBeenCalledTimes(1);
      const auditTx = ok.mock.calls[0]?.[0];
      expect(auditTx, ep.name).not.toBe(t.prisma.db);
      if (reads) {
        // cùng một transaction: repo đọc bằng chính `tx` mà audit ghi
        expect(reads, ep.name).toHaveBeenCalledTimes(1);
        expect(reads.mock.calls[0]?.at(-1), ep.name).toBe(auditTx);
      }
      expect(findBase, ep.name).not.toHaveBeenCalled();
      vi.restoreAllMocks();

      // Audit ném lỗi → 500, không có body CSV
      vi.spyOn(audit, 'log').mockRejectedValueOnce(new Error('audit down'));
      const bad = await post(ep.path, ep.json);
      expect(bad.status, ep.name).toBe(500);
      const text = await bad.text();
      expect(text, ep.name).not.toContain('"csv"');
      expect(text, ep.name).not.toContain('.csv');
      vi.restoreAllMocks();
    }
  });
});
