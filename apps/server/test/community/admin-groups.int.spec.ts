import { pageSchema } from '@opchub/shared/api';
import {
  groupDetailSchema,
  groupItemSchema,
  groupMemberListSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** Tỉnh thật chưa có nhóm seed không tồn tại (34 tỉnh đều có) → test dùng nhóm seed xoá mềm rồi tạo lại */
describe('Admin Nhóm cộng đồng (TIP-B20)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  const admin = async () => {
    const u = await createUser(t, { systemRole: 'admin' });
    return { u, token: await tokenOf(t, u) };
  };

  it('member thường → 403; admin list size mặc định 10, myStatus null', async () => {
    const plain = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await t.call('/admin/groups', { token: plain })).status).toBe(403);
    const { token } = await admin();
    const p = pageSchema(groupItemSchema).parse(
      await (await t.call('/admin/groups', { token })).json(),
    );
    expect(p.size).toBe(10);
    expect(p.items.every((g) => g.myStatus === null)).toBe(true);
  });

  it('xoá mềm nhóm tỉnh rồi tạo lại cùng tỉnh: phòng mặc định + chủ nhóm + ĐPV + audit', async () => {
    const { u, token } = await admin();
    const mod = await createUser(t, { fee: 'active' });
    // Lấy 1 nhóm seed, đổi tên tạm để không đụng e2e; khôi phục ở cuối
    const seed = await t.prisma.db.group.findUniqueOrThrow({
      where: { id: 'c34' },
      select: { province: true, deletedAt: true },
    });
    expect(seed.deletedAt).toBeNull();
    const del = await t.call('/admin/groups/c34', { method: 'DELETE', token });
    expect(await del.json()).toEqual({ id: 'c34' });
    try {
      const body = {
        name: `OPC thử ${randomUUID().slice(0, 6)}`,
        province: seed.province,
        description: 'Nhóm tạo lại',
        joinMode: 'open',
        moderatorIds: [mod.id, u.id],
        roomKeys: ['qa'],
        extraRooms: [{ name: 'Góc Đầu tư', description: 'Gọi vốn' }],
        rules: ['Tôn trọng nhau'],
      };
      const r = await t.call('/admin/groups', { method: 'POST', token, json: body });
      expect(r.status).toBe(201);
      const d = groupDetailSchema.parse(await r.json());
      expect(d.ownerId).toBe(u.id);
      expect(d.moderatorIds).toEqual([mod.id]);
      expect(d.roomKeys).toEqual(['general', 'qa']);
      expect(d.extraRooms).toEqual([{ name: 'Góc Đầu tư', description: 'Gọi vốn' }]);
      expect(d.memberCount).toBe(2);
      expect(d.region).toBe('Miền Nam');

      const dup = await t.call('/admin/groups', { method: 'POST', token, json: body });
      expect(dup.status).toBe(409);

      // Sửa: gửi lại phòng cũ không nhân đôi, đổi tên
      const patch = await t.call(`/admin/groups/${d.id}`, {
        method: 'PATCH',
        token,
        json: { ...body, name: `${body.name} Mới`, moderatorIds: [] },
      });
      const d2 = groupDetailSchema.parse(await patch.json());
      expect(d2.name).toBe(`${body.name} Mới`);
      expect(d2.extraRooms).toHaveLength(1);
      expect(d2.moderatorIds).toEqual([]);
      expect(
        await t.prisma.db.auditLog.count({
          where: { entityId: d.id, action: { in: ['group.create', 'group.update'] } },
        }),
      ).toBe(2);
      await t.call(`/admin/groups/${d.id}`, { method: 'DELETE', token });
    } finally {
      await t.prisma.db.group.update({ where: { id: 'c34' }, data: { deletedAt: null } });
    }
  });

  it('member-counts + members theo nhóm + export 202 có số dòng + audit', async () => {
    const { token } = await admin();
    const g = await createGroup(t);
    const a = await createUser(t, { accountType: 'business', fee: 'active' });
    const b = await createUser(t, { status: 'locked' });
    await addMember(t, g.id, a.id, 'owner');
    await addMember(t, g.id, b.id);

    const counts = (await (
      await t.call('/admin/groups/member-counts', { token })
    ).json()) as Record<string, number>;
    expect(counts[g.id]).toBe(2);

    const all = groupMemberListSchema.parse(
      await (await t.call(`/admin/groups/members?groupIds=${g.id}&status=all`, { token })).json(),
    );
    expect(all.items.map((r) => [r.userId, r.groupRole])).toEqual([
      [a.id, 'owner'],
      [b.id, 'member'],
    ]);
    const locked = groupMemberListSchema.parse(
      await (
        await t.call(`/admin/groups/members?groupIds=${g.id}&status=locked`, { token })
      ).json(),
    );
    expect(locked.items.map((r) => r.userId)).toEqual([b.id]);

    const ex = await t.call('/admin/groups/members/export', {
      method: 'POST',
      token,
      json: { groupIds: [g.id], fields: ['fullName', 'email'], status: 'all', format: 'csv' },
    });
    expect(ex.status).toBe(202);
    const job = (await ex.json()) as { jobId: string; rows: number };
    expect(job.rows).toBe(2);
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'group.members.export', entityId: job.jobId },
      }),
    ).toBe(1);
  });
});
