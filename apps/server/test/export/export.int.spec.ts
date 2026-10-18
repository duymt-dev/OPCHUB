import { FakeStorageProvider } from '@opchub/integrations';
import { exportJobSchema, exportStatusSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { STORAGE } from '@/common/integrations';
import { ExportService } from '@/modules/export';
import { addMember, createGroup, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** B43: job xuất thật — export_jobs + outbox + audit; worker dựng CSV lên storage (fake) */
describe('Xuất dữ liệu (B43)', () => {
  let t: TestApp;
  const storage = new FakeStorageProvider();
  let adminId: string;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp({ overrides: [[STORAGE, storage]] });
  });
  beforeEach(async () => {
    await flushAuthState(t);
    const a = await createUser(t, { systemRole: 'admin' });
    adminId = a.id;
    admin = await tokenOf(t, a);
  });
  afterAll(async () => {
    await t.prisma.db.exportJob.deleteMany({ where: { requestedBy: { in: [adminId] } } });
    await t.close();
  });

  const run = (id: string) => t.app.get(ExportService).run(id);
  const csvOf = (id: string) =>
    storage.objects.get(`exports/${id}.csv`)?.body.toString('utf8') ?? '';

  it('xuất thành viên nhóm → queued + outbox + audit → worker done, đủ dòng; người khác 404', async () => {
    const g = await createGroup(t);
    const ms = await Promise.all([1, 2, 3].map(() => createUser(t)));
    for (const m of ms) await addMember(t, g.id, m.id);
    const res = await t.call('/admin/groups/members/export', {
      method: 'POST',
      token: admin,
      json: { groupIds: [g.id], fields: ['group', 'name', 'email'], status: 'all', format: 'csv' },
    });
    expect(res.status).toBe(202);
    const body = exportJobSchema.extend({ rows: z.number().int() }).parse(await res.json());
    expect(body.rows).toBe(3);
    const ev = await t.prisma.db.outboxEvent.count({
      where: { type: 'export.requested', payload: { equals: { exportJobId: body.jobId } } },
    });
    expect(ev).toBe(1);
    const audit = await t.prisma.db.auditLog.findFirst({
      where: { action: 'group.members.export', entityId: body.jobId },
    });
    expect(audit).not.toBeNull();

    const before = exportStatusSchema.parse(
      await (await t.call(`/admin/exports/${body.jobId}`, { token: admin })).json(),
    );
    expect(before).toMatchObject({ status: 'queued', url: null });
    await run(body.jobId);
    await run(body.jobId); // chạy lại → no-op
    const after = exportStatusSchema.parse(
      await (await t.call(`/admin/exports/${body.jobId}`, { token: admin })).json(),
    );
    expect(after).toMatchObject({ status: 'done', rowCount: 3, kind: 'group_members' });
    expect(after.url).toContain(`exports/${body.jobId}.csv`);
    const csv = csvOf(body.jobId);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\n');
    expect(lines[0]).toBe('Nhóm,Họ và tên,Email');
    expect(lines).toHaveLength(4);
    for (const m of ms) expect(csv).toContain(m.email);

    const other = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    expect((await t.call(`/admin/exports/${body.jobId}`, { token: other })).status).toBe(404);
  });

  it('xuất danh sách người dùng chọn lọc → CSV đúng người; không xuất super_admin', async () => {
    const us = await Promise.all([1, 2].map(() => createUser(t)));
    const sa = await createUser(t, { systemRole: 'super_admin' });
    const res = await t.call('/admin/users/export', {
      method: 'POST',
      token: admin,
      json: { userIds: [...us.map((u) => u.id), sa.id] },
    });
    expect(res.status).toBe(202);
    const { jobId } = exportJobSchema.parse(await res.json());
    await run(jobId);
    const s = exportStatusSchema.parse(
      await (await t.call(`/admin/exports/${jobId}`, { token: admin })).json(),
    );
    expect(s).toMatchObject({ status: 'done', rowCount: 2 });
    const csv = csvOf(jobId);
    expect(csv).toContain('Mã thành viên');
    expect(csv).not.toContain(sa.email);
  });

  it('lỗi storage → failed, không có url', async () => {
    const res = await t.call('/admin/users/export', {
      method: 'POST',
      token: admin,
      json: { userIds: [adminId] },
    });
    const { jobId } = exportJobSchema.parse(await res.json());
    const put = storage.put.bind(storage);
    storage.put = () => Promise.reject(new Error('mất kết nối storage'));
    try {
      await run(jobId);
    } finally {
      storage.put = put;
    }
    const s = exportStatusSchema.parse(
      await (await t.call(`/admin/exports/${jobId}`, { token: admin })).json(),
    );
    expect(s).toMatchObject({ status: 'failed', url: null });
  });

  const statusOf = async (jobId: string) =>
    exportStatusSchema.parse(
      await (await t.call(`/admin/exports/${jobId}`, { token: admin })).json(),
    );
  const downloads = (jobId: string) =>
    t.prisma.db.auditLog.count({ where: { action: 'export.download', entityId: jobId } });
  const newUserJob = async () => {
    const res = await t.call('/admin/users/export', {
      method: 'POST',
      token: admin,
      json: { userIds: [adminId] },
    });
    return exportJobSchema.parse(await res.json()).jobId;
  };

  it('REQ-214 NA-14 tải file ghi audit export.download mỗi lần trả url', async () => {
    const jobId = await newUserJob();
    await run(jobId);
    const a = await statusOf(jobId);
    const b = await statusOf(jobId);
    expect(a.url).toContain(`exports/${jobId}.csv`);
    expect(b.url).not.toBeNull();
    expect(await downloads(jobId)).toBe(2);
    const row = await t.prisma.db.auditLog.findFirst({
      where: { action: 'export.download', entityId: jobId },
      select: { actorId: true, entity: true, tag: true, summary: true },
    });
    expect(row).toMatchObject({ actorId: adminId, entity: 'export', tag: 'member' });
    expect(row?.summary).toBe('tải file xuất users (1 dòng)');
  });

  it('REQ-214 link ký 3600 giây', async () => {
    const jobId = await newUserJob();
    await run(jobId);
    const s = await statusOf(jobId);
    expect(s.expiresInSec).toBe(3600);
    expect(s.url).toContain('ttl=3600');
  });

  it('REQ-214 job chưa xong không ghi audit', async () => {
    const jobId = await newUserJob();
    const s = await statusOf(jobId);
    expect(s).toMatchObject({ status: 'queued', url: null, expiresInSec: null });
    expect(await downloads(jobId)).toBe(0);
  });
});
