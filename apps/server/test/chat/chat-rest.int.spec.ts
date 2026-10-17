import {
  chatMessagePageSchema,
  chatMessageSchema,
  chatOverviewSchema,
  chatRoomSchema,
  cursorPageSchema,
  messageSchema,
  roomMembersSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const rooms = z.object({ items: z.array(chatRoomSchema) });

describe('Chat REST (TIP-B23)', () => {
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

  async function setup() {
    const g = await createGroup(t);
    const owner = await createUser(t, { fee: 'active' });
    const mem = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, owner.id, 'owner');
    await addMember(t, g.id, mem.id);
    return {
      g,
      room: `${g.id}-general`,
      owner,
      mem,
      ownerTk: await tokenOf(t, owner),
      memTk: await tokenOf(t, mem),
    };
  }
  const send = (token: string, room: string, body: Record<string, unknown>) =>
    t.call(`/rooms/${room}/messages`, {
      method: 'POST',
      token,
      json: { clientMsgId: randomUUID(), ...body },
    });

  it('gửi tin idempotent theo clientMsgId; người ngoài → 403; body rỗng → 400', async () => {
    const { room, memTk } = await setup();
    const clientMsgId = randomUUID();
    const a = await send(memTk, room, { clientMsgId, body: 'Xin chào' });
    expect(a.status).toBe(201);
    const m1 = chatMessageSchema.parse(await a.json());
    const b = await send(memTk, room, { clientMsgId, body: 'Xin chào' });
    expect(chatMessageSchema.parse(await b.json()).id).toBe(m1.id);
    expect(await t.prisma.db.message.count({ where: { roomId: room, clientMsgId } })).toBe(1);
    expect(m1).toMatchObject({ senderRole: null, kind: 'text', clientMsgId });
    expect('isSimulated' in m1).toBe(false);

    const outsider = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const r = await send(outsider, room, { body: 'x' });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: { message: string } }).error.message).toBe(
      'Chỉ thành viên nhóm mới xem và gửi được tin nhắn',
    );
    expect((await send(memTk, room, { body: '   ' })).status).toBe(400);
  });

  it('lịch sử keyset before/after + tìm kiếm + file, ảnh, trả lời, chủ nhóm', async () => {
    const { room, memTk, ownerTk, owner } = await setup();
    const sent = [];
    for (const body of ['m1 Meetup', 'm2', 'm3']) {
      sent.push(chatMessageSchema.parse(await (await send(memTk, room, { body })).json()));
    }
    const file = { name: 'Ke-hoach.pdf', size: '1.2 MB', ext: 'pdf' };
    await send(memTk, room, { kind: 'file', attachment: file });
    const rep = chatMessageSchema.parse(
      await (await send(ownerTk, room, { body: 'Trả lời', replyTo: sent[0]?.id })).json(),
    );
    expect(rep.senderRole).toBe('owner');
    expect(rep.senderId).toBe(owner.id);
    expect(rep.replyTo?.text).toBe('m1 Meetup');

    const p1 = chatMessagePageSchema.parse(
      await (await t.call(`/rooms/${room}/messages?size=2`, { token: memTk })).json(),
    );
    expect(p1.items.map((m) => m.body)).toEqual(['Trả lời', '']);
    expect(p1.nextCursor).not.toBeNull();
    const p2 = chatMessagePageSchema.parse(
      await (
        await t.call(`/rooms/${room}/messages?size=10&before=${p1.nextCursor ?? ''}`, {
          token: memTk,
        })
      ).json(),
    );
    expect(p2.items.map((m) => m.body)).toEqual(['m3', 'm2', 'm1 Meetup']);
    expect(p2.nextCursor).toBeNull();
    const after = chatMessagePageSchema.parse(
      await (
        await t.call(`/rooms/${room}/messages?after=${sent[0]?.id ?? ''}`, { token: memTk })
      ).json(),
    );
    expect(after.items.map((m) => m.body)).toEqual(['m2', 'm3', '', 'Trả lời']);
    const q = chatMessagePageSchema.parse(
      await (await t.call(`/rooms/${room}/messages?q=meetup`, { token: memTk })).json(),
    );
    expect(q.items).toHaveLength(1);
    const files = (await (await t.call(`/rooms/${room}/files`, { token: memTk })).json()) as {
      items: { name: string }[];
    };
    expect(files.items.map((f) => f.name)).toEqual(['Ke-hoach.pdf']);
  });

  it('react toggle, pin chỉ chủ nhóm, pins mới nhất trước', async () => {
    const { room, memTk, ownerTk } = await setup();
    const m = chatMessageSchema.parse(await (await send(memTk, room, { body: 'Hey' })).json());
    const react = () =>
      t.call(`/messages/${m.id}/reactions`, {
        method: 'POST',
        token: memTk,
        json: { emoji: '😮' },
      });
    const r1 = chatMessageSchema.parse(await (await react()).json());
    expect(r1.reactions).toEqual([{ emoji: '😮', count: 1, names: [expect.any(String)] }]);
    expect(r1.myReactions).toEqual(['😮']);
    const r2 = chatMessageSchema.parse(await (await react()).json());
    expect(r2.reactions).toEqual([]);

    const pin = (token: string, pinned: boolean) =>
      t.call(`/messages/${m.id}/pin`, { method: 'PUT', token, json: { pinned } });
    expect((await pin(memTk, true)).status).toBe(403);
    expect(chatMessageSchema.parse(await (await pin(ownerTk, true)).json()).pinned).toBe(true);
    const pins = (await (await t.call(`/rooms/${room}/pins`, { token: memTk })).json()) as {
      items: { messageId: string; text: string }[];
    };
    expect(pins.items).toEqual([expect.objectContaining({ messageId: m.id, text: 'Hey' })]);
    expect(chatMessageSchema.parse(await (await pin(ownerTk, false)).json()).pinned).toBe(false);
  });

  it('chủ đề: tạo (key), trùng "chung" → 409, xoá chủ đề của mình, không xoá phòng mặc định', async () => {
    const { g, room, memTk, ownerTk } = await setup();
    const c = await t.call(`/groups/${g.id}/rooms`, {
      method: 'POST',
      token: memTk,
      json: { name: 'Hỏi đáp thuế' },
    });
    expect(c.status).toBe(201);
    const topic = chatRoomSchema.parse(await c.json());
    expect(topic).toMatchObject({ key: 'hoi-dap-thue', mine: true, description: 'Chủ đề mới' });
    const dup = await t.call(`/groups/${g.id}/rooms`, {
      method: 'POST',
      token: memTk,
      json: { name: 'chung' },
    });
    expect(dup.status).toBe(409);
    expect(((await dup.json()) as { error: { message: string } }).error.message).toBe(
      'Chủ đề này đã có trong nhóm',
    );
    const list = rooms.parse(
      await (await t.call(`/groups/${g.id}/rooms`, { token: memTk })).json(),
    );
    expect(list.items.map((r) => r.key)).toEqual(['general', 'hoi-dap-thue']);
    expect((await t.call(`/rooms/${topic.id}`, { method: 'DELETE', token: ownerTk })).status).toBe(
      403,
    );
    expect((await t.call(`/rooms/${room}`, { method: 'DELETE', token: memTk })).status).toBe(403);
    expect((await t.call(`/rooms/${topic.id}`, { method: 'DELETE', token: memTk })).status).toBe(
      200,
    );
  });

  it('chưa đọc: tin người khác +1, /read → 0; /me/chat joined + others; members', async () => {
    const { g, room, memTk, ownerTk } = await setup();
    await t.call(`/rooms/${room}/read`, { method: 'POST', token: memTk });
    await send(ownerTk, room, { body: 'a' });
    await send(ownerTk, room, { body: 'b' });
    const list = rooms.parse(
      await (await t.call(`/groups/${g.id}/rooms`, { token: memTk })).json(),
    );
    expect(list.items[0]?.unread).toBe(2);
    expect(list.items[0]?.lastMessage?.text).toBe('b');
    // Gửi tin = đã đọc tới tin của mình
    await send(memTk, room, { body: 'của tôi' });
    const sentRead = rooms.parse(
      await (await t.call(`/groups/${g.id}/rooms`, { token: memTk })).json(),
    );
    expect(sentRead.items[0]?.unread).toBe(0);
    await send(ownerTk, room, { body: 'c' });
    await t.call(`/rooms/${room}/read`, { method: 'POST', token: memTk });
    const after = rooms.parse(
      await (await t.call(`/groups/${g.id}/rooms`, { token: memTk })).json(),
    );
    expect(after.items[0]?.unread).toBe(0);

    const ov = chatOverviewSchema.parse(
      await (await t.call('/me/chat', { token: ownerTk })).json(),
    );
    const mine = ov.joined.find((x) => x.id === g.id);
    expect(mine).toMatchObject({ isOwner: true, pendingRequests: 0 });
    expect(ov.others.some((x) => x.id === 'c1')).toBe(true);

    const mem = roomMembersSchema.parse(
      await (await t.call(`/rooms/${room}/members`, { token: memTk })).json(),
    );
    expect(mem.total).toBe(2);
    expect(mem.items[0]?.isModerator).toBe(true);
  });

  it('Admin c.mod không phí đọc phòng/tin với DTO có isSimulated (D-26, D-48); không gửi được', async () => {
    const { g, room, memTk } = await setup();
    await send(memTk, room, { body: 'cho admin xem' });
    const admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const rr = await t.call(`/groups/${g.id}/rooms`, { token: admin });
    expect(rr.status).toBe(200);
    const page = cursorPageSchema(messageSchema).parse(
      await (await t.call(`/rooms/${room}/messages?size=50`, { token: admin })).json(),
    );
    expect(page.items[0]).toMatchObject({ body: 'cho admin xem', isSimulated: false });
    expect((await send(admin, room, { body: 'x' })).status).toBe(402);
  });
});
