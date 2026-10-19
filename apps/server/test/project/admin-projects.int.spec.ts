import { pageSchema } from '@opchub/shared/api';
import {
  adminProjectSchema,
  projectBulkResultSchema,
  projectCountsSchema,
  projectStatsSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { createProject, projectBody, removeTestProjects } from '../factories/project.factory';
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

  /** Chủ dự án sửa dự án đang hiển thị + gửi duyệt → bản sửa Chờ duyệt */
  const revise = async (suffix: string) => {
    const p = await createProject(t, owner);
    const newName = `${p.name} ${suffix}`;
    const r = await t.call(`/projects/${p.id}`, {
      method: 'PATCH',
      token: owner,
      json: projectBody({ name: newName, tags: ['Mới'] }),
    });
    expect(r.status).toBe(200);
    return { ...p, newName };
  };
  const counts = async () =>
    projectCountsSchema.parse(
      await (await t.call('/admin/projects/counts', { token: admin })).json(),
    );
  const actionsOf = async (id: string) =>
    (
      await t.prisma.db.auditLog.findMany({ where: { entityId: id }, select: { action: true } })
    ).map((l) => l.action);

  it('REQ-106 duyệt bản sửa áp nội dung + audit; counts gồm bản sửa', async () => {
    const before = await counts();
    const p = await revise('duyệt');
    expect((await counts()).pending_review).toBe((before.pending_review ?? 0) + 1);
    const pending = pageSchema(adminProjectSchema).parse(
      await (
        await t.call('/admin/projects?status=pending_review&size=100', { token: admin })
      ).json(),
    );
    expect(pending.items.find((i) => i.id === p.id)).toMatchObject({
      status: 'published',
      name: p.name,
      revision: { status: 'pending_review', name: p.newName, tags: ['Mới'] },
    });
    const done = adminProjectSchema.parse(await (await review(p.id, 'approve')).json());
    expect(done).toMatchObject({ status: 'published', name: p.newName, revision: null });
    const rev = await t.prisma.db.projectRevision.findFirstOrThrow({
      where: { projectId: p.id },
      select: { status: true, decidedAt: true },
    });
    expect(rev.status).toBe('approved');
    expect(rev.decidedAt).not.toBeNull();
    const pub = (await (await t.call(`/projects/${p.id}`, { token: owner })).json()) as {
      name: string;
      updates: { title: string }[];
    };
    expect(pub.name).toBe(p.newName);
    expect(pub.updates[0]?.title).toBe('Cập nhật được duyệt');
    expect(await actionsOf(p.id)).toEqual(['project.revision_approve']);
    // Không còn bản sửa chờ → luồng dự án (đang hiển thị → duyệt lại 409)
    expect((await review(p.id, 'approve')).status).toBe(409);
  });

  it('REQ-106 từ chối bản sửa giữ bản đang hiển thị; chủ dự án thấy lý do', async () => {
    const p = await revise('từ chối');
    const r = adminProjectSchema.parse(await (await review(p.id, 'reject', 'Sai lĩnh vực')).json());
    expect(r).toMatchObject({
      status: 'published',
      name: p.name,
      revision: { status: 'rejected', reviewNote: 'Sai lĩnh vực' },
    });
    const mine = (await (await t.call('/me/projects', { token: owner })).json()) as {
      items: { id: string; name: string; status: string; revision: unknown }[];
    };
    expect(mine.items.find((i) => i.id === p.id)).toMatchObject({
      name: p.name,
      status: 'published',
      revision: { status: 'rejected', reviewNote: 'Sai lĩnh vực' },
    });
    expect(await actionsOf(p.id)).toEqual(['project.revision_reject']);
  });

  it('REQ-106 yêu cầu chỉnh sửa bản sửa → needs_changes, gửi lại cùng bản', async () => {
    const p = await revise('sửa');
    const r = adminProjectSchema.parse(
      await (await review(p.id, 'request_changes', 'Bổ sung mô tả')).json(),
    );
    expect(r.status).toBe('published');
    expect(r.revision).toMatchObject({ status: 'needs_changes', reviewNote: 'Bổ sung mô tả' });
    const again = await t.call(`/projects/${p.id}`, {
      method: 'PATCH',
      token: owner,
      json: projectBody({ name: p.newName }),
    });
    expect(again.status).toBe(200);
    const revs = await t.prisma.db.projectRevision.findMany({
      where: { projectId: p.id },
      select: { status: true },
    });
    expect(revs).toEqual([{ status: 'pending_review' }]);
  });

  it('request_changes / republish hợp lệ trên dự án (nợ M4 #6 #7)', async () => {
    const p = await createProject(t, owner, {}, false);
    const ch = adminProjectSchema.parse(
      await (await review(p.id, 'request_changes', 'Thiếu link')).json(),
    );
    expect(ch).toMatchObject({ status: 'needs_changes', reviewNote: 'Thiếu link' });
    expect((await review(p.id, 'request_changes', 'Lần 2')).status).toBe(409);
    const live = await createProject(t, owner);
    expect((await review(live.id, 'hide')).status).toBe(200);
    expect((await review(live.id, 'republish')).status).toBe(200);
    expect((await review(live.id, 'republish')).status).toBe(409);
    expect([...(await actionsOf(p.id)), ...(await actionsOf(live.id))].sort()).toEqual([
      'project.hide',
      'project.republish',
      'project.request_changes',
    ]);
  });

  it('điều phối viên (không có p.pub) → 403', async () => {
    const mod = await tokenOf(t, await createUser(t, { systemRole: 'moderator' }));
    expect((await t.call('/admin/projects', { token: mod })).status).toBe(403);
  });
});
