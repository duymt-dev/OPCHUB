import { pageSchema } from '@opchub/shared/api';
import {
  adminProjectSchema,
  projectBulkResultSchema,
  projectCountsSchema,
  projectStatsSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('Admin kiểm duyệt dự án (B32)', () => {
  let t: TestApp;
  let admin: string;
  let owner: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    owner = await tokenOf(t, await createUser(t, { fee: 'active' }));
  });
  // Giới hạn đăng nhập theo IP: mỗi test dùng nhiều tài khoản
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await t.call('/admin/projects/featured', {
      method: 'PUT',
      token: admin,
      json: { projectId: null },
    });
    await removeTestProjects(t);
    await t.close();
  });

  const review = (id: string, decision: string, note?: string) =>
    t.call(`/admin/projects/${id}/review`, {
      method: 'POST',
      token: admin,
      json: { decision, ...(note ? { note } : {}) },
    });

  it('duyệt: approve → published + audit; duyệt lại → 409; từ chối thiếu ghi chú → 400', async () => {
    const p = await createProject(t, owner, {}, false);
    const r = await review(p.id, 'approve');
    expect(adminProjectSchema.parse(await r.json()).status).toBe('published');
    expect((await review(p.id, 'approve')).status).toBe(409);
    const q = await createProject(t, owner, {}, false);
    expect((await review(q.id, 'reject')).status).toBe(400);
    const rej = adminProjectSchema.parse(await (await review(q.id, 'reject', 'Spam')).json());
    expect(rej).toMatchObject({ status: 'rejected', reviewNote: 'Spam' });
    const logs = await t.prisma.db.auditLog.findMany({
      where: { entityId: { in: [p.id, q.id] } },
      select: { action: true, tag: true },
    });
    expect(logs.map((l) => l.action).sort()).toEqual(['project.approve', 'project.reject']);
    expect(logs.every((l) => l.tag === 'project')).toBe(true);
  });

  it('nổi bật: chỉ dự án đang hiển thị; ẩn → bỏ nổi bật; stats Portal dùng dự án nổi bật', async () => {
    const p = await createProject(t, owner);
    const draft = await createProject(t, owner, {}, false);
    const put = (projectId: string | null) =>
      t.call('/admin/projects/featured', { method: 'PUT', token: admin, json: { projectId } });
    expect((await put(draft.id)).status).toBe(409);
    expect((await put(p.id)).status).toBe(200);
    const stats = projectStatsSchema.parse(
      await (await t.call('/projects/stats', { token: owner })).json(),
    );
    expect(stats.featured?.id).toBe(p.id);
    expect((await review(p.id, 'hide')).status).toBe(200);
    const row = await t.prisma.db.project.findUniqueOrThrow({
      where: { id: p.id },
      select: { featuredAt: true },
    });
    expect(row.featuredAt).toBeNull();
  });

  it('bulk publish/hide/delete: không đủ điều kiện vào skipped; counts đủ 6 khoá', async () => {
    const a = await createProject(t, owner, {}, false);
    const b = await createProject(t, owner);
    const bulk = async (ids: string[], action: string) =>
      projectBulkResultSchema.parse(
        await (
          await t.call('/admin/projects/bulk', {
            method: 'POST',
            token: admin,
            json: { ids, action },
          })
        ).json(),
      );
    expect(await bulk([a.id, b.id], 'publish')).toEqual({ done: [a.id], skipped: [b.id] });
    expect((await bulk([a.id, b.id], 'hide')).done.sort()).toEqual([a.id, b.id].sort());
    expect(await bulk([a.id], 'delete')).toEqual({ done: [a.id], skipped: [] });
    expect((await t.call(`/admin/projects/${a.id}`, { token: admin })).status).toBe(404);
    expect(
      (await t.call(`/admin/projects/${a.id}`, { method: 'DELETE', token: admin })).status,
    ).toBe(404);

    const counts = projectCountsSchema.parse(
      await (await t.call('/admin/projects/counts', { token: admin })).json(),
    );
    expect(Object.keys(counts).sort()).toEqual([
      'draft',
      'hidden',
      'needs_changes',
      'pending_review',
      'published',
      'rejected',
    ]);
    const hidden = pageSchema(adminProjectSchema).parse(
      await (await t.call('/admin/projects?status=hidden&size=100', { token: admin })).json(),
    );
    expect(hidden.items.some((p) => p.id === b.id)).toBe(true);
  });

  it('điều phối viên (không có p.pub) → 403', async () => {
    const mod = await tokenOf(t, await createUser(t, { systemRole: 'moderator' }));
    expect((await t.call('/admin/projects', { token: mod })).status).toBe(403);
  });
});
