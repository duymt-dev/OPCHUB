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

  /**
   * Nhóm test có tỉnh THẬT (form Admin kiểm tỉnh): mượn tỉnh của nhóm seed `seedId` — xoá mềm nhóm
   * seed trong lúc test, `restore` trả lại (giữ đủ 34 nhóm cho e2e).
   */
  async function realProvinceGroup(seedId: string) {
    const g = await createGroup(t);
    const seed = await t.prisma.db.group.findUniqueOrThrow({
      where: { id: seedId },
      select: { province: true },
    });
    await t.prisma.db.group.update({ where: { id: seedId }, data: { deletedAt: new Date() } });
    await t.prisma.db.group.update({ where: { id: g.id }, data: { province: seed.province } });
    return {
      g,
      restore: async () => {
        await t.prisma.db.group.update({
          where: { id: g.id },
          data: { province: `Tỉnh thử ${g.id}`, deletedAt: new Date() },
        });
        await t.prisma.db.group.update({ where: { id: seedId }, data: { deletedAt: null } });
      },
    };
  }

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

  it('REQ-229 NA-29 xoá mềm nhóm tỉnh rồi tạo lại cùng tỉnh: chủ nhóm là thành viên + Chung + giảng viên + audit; trùng tỉnh 409', async () => {
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
    let createdId: string | null = null;
    try {
      const body = {
        name: `OPC thử ${randomUUID().slice(0, 6)}`,
        province: seed.province,
        description: 'Nhóm tạo lại',
        joinMode: 'open',
        lecturerIds: [mod.id, u.id],
        roomKeys: ['qa'],
        extraRooms: [{ name: 'Góc Đầu tư', description: 'Gọi vốn' }],
        rules: ['Tôn trọng nhau'],
      };
      const r = await t.call('/admin/groups', { method: 'POST', token, json: body });
      expect(r.status).toBe(201);
      const d = groupDetailSchema.parse(await r.json());
      createdId = d.id;
      expect(d.ownerId).toBe(u.id);
      expect(d.lecturerIds).toEqual([mod.id]);
      // NA-29: chủ nhóm có dòng group_members(owner, member)
      const ownerRow = await t.prisma.db.groupMember.findUniqueOrThrow({
        where: { groupId_userId: { groupId: d.id, userId: u.id } },
        select: { groupRole: true, status: true },
      });
      expect(ownerRow).toEqual({ groupRole: 'owner', status: 'member' });
      expect(d.roomKeys).toEqual(['general', 'qa']);
      expect(d.extraRooms).toEqual([{ name: 'Góc Đầu tư', description: 'Gọi vốn' }]);
      expect(d.memberCount).toBe(2);
      expect(d.region).toBe('Miền Nam');

      const dup = await t.call('/admin/groups', { method: 'POST', token, json: body });
      expect(dup.status).toBe(409);
      const other = await t.call('/admin/groups', {
        method: 'POST',
        token,
        json: { ...body, name: `${body.name} khác` },
      });
      expect(other.status).toBe(409);
      expect(((await other.json()) as { error: { message: string } }).error.message).toBe(
        `Đã có nhóm cho ${seed.province}`,
      );

      // Sửa: gửi lại phòng cũ không nhân đôi, đổi tên
      const patch = await t.call(`/admin/groups/${d.id}`, {
        method: 'PATCH',
        token,
        json: { ...body, name: `${body.name} Mới`, lecturerIds: [] },
      });
      const d2 = groupDetailSchema.parse(await patch.json());
      expect(d2.name).toBe(`${body.name} Mới`);
      expect(d2.extraRooms).toHaveLength(1);
      // GR-R02: vai trò Giảng viên lưu theo cặp nhóm–thành viên, bỏ khỏi form không hạ
      expect(d2.lecturerIds).toEqual([mod.id]);
      expect(
        await t.prisma.db.auditLog.count({
          where: { entityId: d.id, action: { in: ['group.create', 'group.update'] } },
        }),
      ).toBe(2);
      await t.call(`/admin/groups/${d.id}`, { method: 'DELETE', token });
    } finally {
      // Nhóm tạo lại dùng tỉnh thật (removeTestGroups không bắt) → xoá cứng, giữ đúng 34 nhóm seed
      if (createdId) await t.prisma.db.group.delete({ where: { id: createdId } });
      await t.prisma.db.group.update({ where: { id: 'c34' }, data: { deletedAt: null } });
    }
  });

  it('REQ-229 NA-29 đổi chủ nhóm: chủ cũ → Thành viên, chủ mới nhận thông báo; giảng viên giữ nguyên', async () => {
    const { u, token } = await admin();
    const { g, restore } = await realProvinceGroup('c33');
    const a = await createUser(t, { fee: 'active' });
    const b = await createUser(t, { fee: 'active' });
    const lec = await createUser(t, { fee: 'active' });
    try {
      await addMember(t, g.id, a.id, 'owner');
      await addMember(t, g.id, lec.id, 'lecturer');
      const cur = groupDetailSchema.parse(
        await (await t.call(`/admin/groups/${g.id}`, { token })).json(),
      );
      const r = await t.call(`/admin/groups/${g.id}`, {
        method: 'PATCH',
        token,
        json: {
          name: cur.name,
          province: cur.province,
          description: cur.description,
          joinMode: cur.joinMode,
          ownerId: b.id,
          lecturerIds: [],
          roomKeys: cur.roomKeys,
          extraRooms: cur.extraRooms,
          rules: cur.rules,
        },
      });
      expect(r.status).toBe(200);
      const roles = await t.prisma.db.groupMember.findMany({
        where: { groupId: g.id, userId: { in: [a.id, b.id, lec.id] } },
        select: { userId: true, groupRole: true },
      });
      const of = (id: string) => roles.find((x) => x.userId === id)?.groupRole;
      expect([of(a.id), of(b.id), of(lec.id)]).toEqual(['member', 'owner', 'lecturer']);
      const out = await t.prisma.db.outboxEvent.findMany({
        where: { type: 'group.owner_changed', payload: { path: ['groupId'], equals: g.id } },
        select: { payload: true },
      });
      expect(out.map((o) => o.payload)).toEqual([{ groupId: g.id, userId: b.id }]);
      expect(u.id).not.toBe(b.id);
    } finally {
      await restore();
    }
  });

  it('REQ-209 NA-09 Admin thêm chủ đề: trùng tên (kể cả "Chung") bỏ qua, outbox group.topic_created', async () => {
    const { token } = await admin();
    const { g, restore } = await realProvinceGroup('c32');
    const owner = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, owner.id, 'owner');
    try {
      const cur = groupDetailSchema.parse(
        await (await t.call(`/admin/groups/${g.id}`, { token })).json(),
      );
      const save = (extraRooms: { name: string; description: string }[]) =>
        t.call(`/admin/groups/${g.id}`, {
          method: 'PATCH',
          token,
          json: {
            name: cur.name,
            province: cur.province,
            description: cur.description,
            joinMode: cur.joinMode,
            ownerId: owner.id,
            roomKeys: cur.roomKeys,
            extraRooms,
            rules: cur.rules,
          },
        });
      expect((await save([{ name: 'Tuyển dụng', description: 'Việc làm' }])).status).toBe(200);
      expect(
        (
          await save([
            { name: 'Tuyển dụng', description: 'Việc làm' },
            { name: 'Chung', description: 'trùng' },
          ])
        ).status,
      ).toBe(200);
      const rows = await t.prisma.db.room.findMany({
        where: { groupId: g.id, name: { in: ['Tuyển dụng', 'Chung'] } },
        select: { id: true, name: true },
      });
      expect(rows.map((r) => r.name).sort()).toEqual(['Chung', 'Tuyển dụng']);
      const out = await t.prisma.db.outboxEvent.findMany({
        where: { type: 'group.topic_created', payload: { path: ['groupId'], equals: g.id } },
        select: { payload: true },
      });
      const tuyen = rows.find((r) => r.name === 'Tuyển dụng')?.id;
      expect(out.map((o) => o.payload)).toEqual([{ groupId: g.id, roomIds: [tuyen] }]);
    } finally {
      await restore();
    }
  });

  it('member-counts + members theo nhóm + export 202 có số dòng + audit', async () => {
    const { token } = await admin();
    const g = await createGroup(t);
    const a = await createUser(t, { accountType: 'business', fee: 'active' });
    const b = await createUser(t, { status: 'locked' });
    await addMember(t, g.id, a.id, 'owner');
    await addMember(t, g.id, b.id);

    // Q-B63-4: số dòng xuất được = thành viên thật, không phải số hiển thị `member_count`
    await t.prisma.db.group.update({ where: { id: g.id }, data: { memberCount: 1248 } });
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
