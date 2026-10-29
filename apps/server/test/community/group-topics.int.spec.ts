import { apiErrorSchema } from '@opchub/shared/api';
import { groupDetailSchema, ROOM_ADMIN_MESSAGES } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GroupEventsHandler } from '@/modules/community';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * TIP-V42-709 (D-111, §27.7 "Chỉ Admin quản lý cộng đồng tạo/sửa/xóa chủ đề"): đổi tên + xoá mềm chủ đề;
 * "Chung" khoá; tin giữ trong DB, ẩn khỏi Portal; audit + outbox `group.topic_changed`.
 */
describe('Admin chủ đề nhóm (TIP-V42-709)', () => {
  let t: TestApp;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
  });
  beforeEach(() => flushAuthState(t));

  async function seed() {
    const g = await createGroup(t);
    const mem = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, mem.id);
    const qa = `${g.id}-qa`;
    await t.prisma.db.room.createMany({
      data: [
        { id: qa, groupId: g.id, slug: 'hoi-dap', name: 'Hỏi đáp' },
        { id: `${g.id}-tt`, groupId: g.id, slug: 'thue', name: 'Thuế' },
      ],
    });
    await t.prisma.db.message.create({
      data: {
        roomId: qa,
        senderId: mem.id,
        kind: 'file',
        body: '',
        attachment: { name: 'Hoi-dap.pdf', size: '1 MB', ext: 'PDF', url: 'https://cdn.test/a' },
      },
    });
    return { g, qa, general: `${g.id}-general`, memTk: await tokenOf(t, mem) };
  }

  const patch = (groupId: string, roomId: string, json: unknown, token = admin) =>
    t.call(`/admin/groups/${groupId}/rooms/${roomId}`, { method: 'PATCH', token, json });
  const del = (groupId: string, roomId: string, token = admin) =>
    t.call(`/admin/groups/${groupId}/rooms/${roomId}`, { method: 'DELETE', token });
  const message = async (r: Response) => apiErrorSchema.parse(await r.json()).error.message;

  it('đổi tên → Portal thấy tên mới; trùng tên 409; "Chung" chỉ đổi mô tả; audit + outbox; member 403', async () => {
    const { g, qa, general, memTk } = await seed();
    expect((await patch(g.id, qa, { name: 'X', description: '' }, memTk)).status).toBe(403);
    const dup = await patch(g.id, qa, { name: 'thuế', description: '' });
    expect(dup.status).toBe(409);
    expect(await message(dup)).toBe(ROOM_ADMIN_MESSAGES.duplicate);
    const ok = await patch(g.id, qa, { name: 'Hỏi & đáp', description: 'Hỏi nhanh' });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ id: qa, key: 'hoi-dap', name: 'Hỏi & đáp' });
    const rooms = (await (await t.call(`/groups/${g.id}/rooms`, { token: memTk })).json()) as {
      items: { id: string; name: string }[];
    };
    expect(rooms.items.find((r) => r.id === qa)?.name).toBe('Hỏi & đáp');
    const locked = await patch(g.id, general, { name: 'Chung mới', description: '' });
    expect(locked.status).toBe(409);
    expect(await message(locked)).toBe(ROOM_ADMIN_MESSAGES.defaultLocked);
    expect((await patch(g.id, general, { name: 'Chung', description: 'Mô tả mới' })).status).toBe(
      200,
    );
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'group.topic_rename', entityId: { in: [qa, general] } },
      }),
    ).toBe(2);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'group.topic_changed', payload: { path: ['roomId'], equals: qa } },
      }),
    ).toBe(1);
  });

  it('xoá mềm → chủ đề biến mất, mở cũ 404, file không còn; tin giữ; "Chung" 409; tên dùng lại', async () => {
    const { g, qa, general, memTk } = await seed();
    const locked = await del(g.id, general);
    expect(locked.status).toBe(409);
    expect((await del(g.id, qa)).status).toBe(200);
    expect((await del(g.id, qa)).status).toBe(404);
    const rooms = (await (await t.call(`/groups/${g.id}/rooms`, { token: memTk })).json()) as {
      items: { id: string }[];
    };
    expect(rooms.items.map((r) => r.id)).not.toContain(qa);
    expect((await t.call(`/rooms/${qa}/messages`, { token: memTk })).status).toBe(404);
    const files = (await (await t.call(`/groups/${g.id}/files`, { token: memTk })).json()) as {
      items: unknown[];
      counts: { all: number };
    };
    expect(files.items).toEqual([]);
    expect(files.counts.all).toBe(0);
    expect(await t.prisma.db.message.count({ where: { roomId: qa } })).toBe(1);
    expect(
      await t.prisma.db.auditLog.count({ where: { action: 'group.topic_delete', entityId: qa } }),
    ).toBe(1);
    // Admin › Nhóm: chi tiết chỉ còn chủ đề sống; thêm lại tên đã xoá được (slug mới)
    const detail = groupDetailSchema.parse(
      await (await t.call(`/admin/groups/${g.id}`, { token: admin })).json(),
    );
    expect(detail.rooms.map((r) => r.name)).toEqual(['Chung', 'Thuế']);
    const out = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'group.topic_changed', payload: { path: ['roomId'], equals: qa } },
      select: { payload: true },
    });
    // Consumer phát `room.reload` (không lỗi khi Redis có sẵn) — tới phòng sống + phòng vừa xoá
    await t.app
      .get(GroupEventsHandler)
      .topicChanged(parseOutboxPayload('group.topic_changed', out.payload));
  });

  it('DB chặn xoá "Chung" (CHECK rooms_default_not_deleted_check)', async () => {
    const { general } = await seed();
    await expect(
      t.prisma.db.room.update({ where: { id: general }, data: { deletedAt: new Date() } }),
    ).rejects.toThrow();
  });
});
