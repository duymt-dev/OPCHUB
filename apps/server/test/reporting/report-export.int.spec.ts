import type { GroupRole } from '@opchub/db';
import { FakeStorageProvider, type StorageProvider } from '@opchub/integrations';
import {
  exportStatusSchema,
  reportExportResponseSchema,
  reportPreviewSchema,
  reportScopesSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE } from '@/common/integrations';
import { ExportService } from '@/modules/export';
import { createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** Tháng giả (03/2001) để không lẫn số liệu thật của DB test */
const MONTH = '2001-03';
const IN = new Date('2001-03-10T05:00:00Z');
const BEFORE = new Date('2001-02-10T05:00:00Z');
const EVENT_PREFIX = 'Sự kiện thử báo cáo';

/** V4-614 (D-78, REQ-516): Admin › Báo cáo — preview + xuất CSV B1/B2/B3 qua job export */
describe('Báo cáo B1 / B2 / B3 (V4-614)', () => {
  let t: TestApp;
  const storage = new FakeStorageProvider();
  let admin: string;
  let adminId: string;
  let g1: { id: string; name: string; province: string };
  let g2: { id: string; name: string; province: string };

  const join = (
    groupId: string,
    userId: string,
    createdAt: Date,
    groupRole: GroupRole = 'member',
  ) =>
    t.prisma.db.groupMember.create({
      data: { groupId, userId, groupRole, status: 'member', createdAt },
    });
  const fee = (userId: string, amount: number, createdAt = IN) =>
    t.prisma.db.membershipFeePeriod.create({
      data: {
        userId,
        amount,
        source: 'transfer',
        startsAt: createdAt,
        endsAt: new Date(createdAt.getTime() + 365 * 86_400_000),
        createdAt,
      },
    });
  const event = (groupId: string, startsAt: Date) =>
    t.prisma.db.event.create({
      data: {
        title: `${EVENT_PREFIX} ${groupId.slice(0, 6)}`,
        mode: 'offline',
        startsAt,
        place: 'Hà Nội',
        address: '1 Phố thử',
        seats: 10,
        groupId,
      },
    });

  beforeAll(async () => {
    t = await createTestApp({ overrides: [[STORAGE, storage]] });
    // G1 (tỉnh P1): chủ nhóm vào 02/2001 + 3 thành viên mới 03/2001. G2 (tỉnh P2, cùng Miền Trung).
    // Mỗi tỉnh một nhóm sống (`groups_province_live`) → B2 có đúng một dòng nhóm.
    g1 = await createGroup(t);
    g2 = await createGroup(t);
    const owner = await createUser(t);
    await join(g1.id, owner.id, BEFORE, 'owner');
    const ms = await Promise.all([1, 2, 3].map(() => createUser(t)));
    for (const m of ms) await join(g1.id, m.id, IN);
    const [both, second] = ms;
    if (!both || !second) throw new Error('thiếu thành viên');
    // `both` ở cả G1 và G2: phí tính cho cả hai tỉnh; G2 còn một người riêng
    const g2m = await createUser(t);
    await join(g2.id, g2m.id, IN);
    await join(g2.id, both.id, IN);
    await fee(both.id, 1_200_000);
    await fee(second.id, 3_600_000);
    await fee(g2m.id, 500_000);
    await fee(owner.id, 999, BEFORE); // ngoài kỳ
    await event(g1.id, IN);
    await event(g1.id, new Date('2001-03-31T16:30:00Z')); // 23:30 31/03 giờ VN → trong kỳ
    await event(g1.id, new Date('2001-03-31T17:30:00Z')); // 00:30 01/04 giờ VN → ngoài kỳ
  });
  beforeEach(async () => {
    await flushAuthState(t);
    const a = await createUser(t, { systemRole: 'admin' });
    adminId = a.id;
    admin = await tokenOf(t, a);
  });
  afterAll(async () => {
    await t.prisma.db.exportJob.deleteMany({ where: { kind: 'report' } });
    await t.prisma.db.event.deleteMany({ where: { title: { startsWith: EVENT_PREFIX } } });
    await removeTestGroups(t);
    await t.close();
  });

  const preview = async (q: string) => {
    const r = await t.call(`/admin/reports/preview?${q}`, { token: admin });
    expect(r.status).toBe(200);
    return reportPreviewSchema.parse(await r.json());
  };
  const exportCsv = async (json: Record<string, string>) => {
    const r = await t.call('/admin/reports/export', { method: 'POST', token: admin, json });
    expect(r.status).toBe(202);
    const { jobId } = reportExportResponseSchema.parse(await r.json());
    await t.app.get(ExportService).run(jobId);
    const csv = storage.objects.get(`exports/${jobId}.csv`)?.body.toString('utf8') ?? '';
    return { jobId, csv, lines: csv.slice(1).split('\n') };
  };

  it('scopes: có nhóm + tỉnh của nhóm thử', async () => {
    const r = await t.call('/admin/reports/scopes', { token: admin });
    const s = reportScopesSchema.parse(await r.json());
    expect(s.groups.some((g) => g.id === g1.id)).toBe(true);
    expect(s.provinces.filter((p) => p.name === g1.province)).toEqual([
      { name: g1.province, region: 'central' },
    ]);
  });

  it('B1 preview + CSV 17 dòng × 4 cột: Thành viên mới 3, Sự kiện ngành 2, audit + outbox', async () => {
    const p = await preview(`template=b1&month=${MONTH}&groupId=${g1.id}`);
    expect(p).toMatchObject({ scope: g1.name, province: g1.province });
    expect(p.leader).toMatch(/^Người thử/);
    expect(p.metrics).toMatchObject({ newMembers: 3, totalMembers: 4, events: 2, topics: 0 });

    const { jobId, csv, lines } = await exportCsv({ template: 'b1', month: MONTH, groupId: g1.id });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines).toHaveLength(17);
    expect(lines[2]).toBe(`"Tên nhóm ngành","${g1.name}","Trưởng nhóm","${p.leader}"`);
    expect(lines[3]).toBe('');
    expect(lines[5]).toBe('"Thành viên mới","","3",""');
    expect(lines[10]).toBe('"Sự kiện ngành","","2",""');

    // tên file tải = `params.file` (không dấu) — fake storage không đưa tên vào url nên bắt đối số
    const names: (string | undefined)[] = [];
    const presign = storage.presignGet.bind(storage);
    const spy: StorageProvider['presignGet'] = (key, ttl, name) => {
      names.push(name);
      return presign(key, ttl);
    };
    storage.presignGet = spy;
    try {
      const s = exportStatusSchema.parse(
        await (await t.call(`/admin/exports/${jobId}`, { token: admin })).json(),
      );
      expect(s).toMatchObject({ kind: 'report', status: 'done', rowCount: 1 });
      expect(s.url).toContain(`exports/${jobId}.csv`);
    } finally {
      storage.presignGet = presign;
    }
    expect(names[0]).toMatch(/^Bao-cao-B1-2001-03-Nhom-thu-[0-9a-f]{8}\.csv$/);
    const audit = await t.prisma.db.auditLog.findFirst({
      where: { action: 'report.export', entityId: jobId },
      select: { tag: true, summary: true, actorId: true },
    });
    expect(audit).toMatchObject({ tag: 'report', actorId: adminId });
    expect(audit?.summary).toBe(`xuất B1 tháng 03/2001 · ${g1.name}`);
    const outbox = await t.prisma.db.outboxEvent.count({
      where: { type: 'export.requested', payload: { equals: { exportJobId: jobId } } },
    });
    expect(outbox).toBe(1);
  });

  it('B2: doanh thu phí 4.800.000 (không lấy tỉnh khác), khối C một dòng / nhóm', async () => {
    const q = new URLSearchParams({ template: 'b2', month: MONTH, province: g1.province });
    const p = await preview(q.toString());
    expect(p.metrics).toMatchObject({
      feeRevenue: 4_800_000,
      newPaidMembers: 2,
      totalMembers: 4,
      newMembers: 3,
      totalRevenue: 4_800_000,
    });
    expect(p.groups).toEqual([
      { groupId: g1.id, name: g1.name, owner: p.groups[0]?.owner, members: 4, messages: 0 },
    ]);

    const { lines } = await exportCsv({ template: 'b2', month: MONTH, province: g1.province });
    expect(lines[2]).toBe('"Trưởng đại diện","","Giám đốc Vùng","",""');
    expect(lines.find((l) => l.startsWith('"Doanh thu phí thành viên'))).toBe(
      '"Doanh thu phí thành viên (đ)","","4800000","",""',
    );
    const c = lines.indexOf(
      '"C. NHÓM NGÀNH","Trưởng nhóm","Thành viên","Hoạt động trong tháng","Ghi chú"',
    );
    expect(c).toBeGreaterThan(0);
    expect(lines[c + 1]).toBe(`"${g1.name}","${p.groups[0]?.owner}","4","0",""`);
    expect(lines[c + 2]).toBe('');
  });

  it('B3 vùng Miền Trung: một dòng / tỉnh + Tổng vùng = tổng các dòng, Top 3 theo doanh thu', async () => {
    const p = await preview(`template=b3&month=${MONTH}&region=central`);
    expect(p.scope).toBe('Miền Trung');
    const row = (province: string) => p.provinces.find((r) => r.province === province);
    expect(row(g1.province)).toEqual({
      province: g1.province,
      newMembers: 3,
      totalMembers: 4,
      events: 2,
      feeRevenue: 4_800_000,
    });
    expect(row(g2.province)).toEqual({
      province: g2.province,
      newMembers: 2,
      totalMembers: 2,
      events: 0,
      feeRevenue: 1_700_000,
    });
    const { lines } = await exportCsv({ template: 'b3', month: MONTH, region: 'central' });
    const sum = (k: 'newMembers' | 'totalMembers' | 'events' | 'feeRevenue') =>
      p.provinces.reduce((a, r) => a + r[k], 0);
    const totals = [sum('newMembers'), sum('totalMembers'), sum('events'), '', sum('feeRevenue')];
    expect(lines.find((l) => l.startsWith('"Tổng vùng"'))).toBe(
      ['Tổng vùng', ...totals, ''].map((v) => `"${v}"`).join(','),
    );
    expect(lines.find((l) => l.startsWith('"Top 3 tỉnh"'))).toContain(g1.province);
  });

  it('400 tháng tương lai / sai định dạng / thiếu phạm vi; 404 nhóm không tồn tại', async () => {
    const get = (q: string) => t.call(`/admin/reports/preview?${q}`, { token: admin });
    expect((await get(`template=b1&month=2999-01&groupId=${g1.id}`)).status).toBe(400);
    expect((await get(`template=b1&month=2001-13&groupId=${g1.id}`)).status).toBe(400);
    expect((await get(`template=b2&month=${MONTH}`)).status).toBe(400);
    expect((await get(`template=b3&month=${MONTH}&region=west`)).status).toBe(400);
    expect((await get(`template=b1&month=${MONTH}&groupId=khong-co`)).status).toBe(404);
    const r = await t.call('/admin/reports/export', {
      method: 'POST',
      token: admin,
      json: { template: 'b1', month: MONTH, groupId: 'khong-co' },
    });
    expect(r.status).toBe(404);
    expect(await t.prisma.db.exportJob.count({ where: { requestedBy: adminId } })).toBe(0);
  });

  it('403 khi thiếu reports.view; Kế toán có quyền mặc định; route kiểm duyệt giữ nguyên', async () => {
    const no = await tokenOf(t, await createUser(t, { adminPermissions: ['members.view'] }));
    const q = `template=b1&month=${MONTH}&groupId=${g1.id}`;
    expect((await t.call(`/admin/reports/preview?${q}`, { token: no })).status).toBe(403);
    expect((await t.call('/admin/reports/scopes', { token: no })).status).toBe(403);
    const keys = await t.prisma.db.adminRolePermission.findMany({
      where: { permissionKey: 'reports.view', role: { key: { in: ['admin', 'accountant'] } } },
      select: { role: { select: { key: true } } },
    });
    expect(keys.map((k) => k.role.key).sort()).toEqual(['accountant', 'admin']);
    const mod = await t.call('/admin/reports?page=1&size=10', { token: admin });
    expect(mod.status).toBe(200);
  });
});
