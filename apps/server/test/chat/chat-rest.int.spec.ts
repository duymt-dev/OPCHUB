import {
  chatMessagePageSchema,
  chatMessageSchema,
  chatOverviewSchema,
  chatRoomSchema,
  cursorPageSchema,
  messageSchema,
  roomFileSchema,
  roomMembersSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { AuthStateService } from '@/common/auth';
import { STORAGE } from '@/common/integrations';
import { appPath, type TempStorage, tempStorage, uploadPng } from '../uploads/storage.helper';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const rooms = z.object({ items: z.array(chatRoomSchema) });

describe('Chat REST (TIP-B23)', () => {
  let t: TestApp;
  let store: TempStorage;

  beforeAll(async () => {
    // TIP-V2-111: tệp/ảnh chat đi presign → storage local tạm (không cần MinIO)
    store = await tempStorage();
    t = await createTestApp({ overrides: [[STORAGE, store.provider]] });
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
    await store.dispose();
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

  /** presign → PUT đúng như FE `presignUpload` → URL công khai */
  async function uploadFile(token: string, kind: string, contentType: string, size: number) {
    const r = await t.call('/uploads/presign', {
      method: 'POST',
      token,
      json: { kind, contentType, size },
    });
    expect(r.status).toBe(200);
    const { uploadUrl, publicUrl } = (await r.json()) as { uploadUrl: string; publicUrl: string };
    const put = await t.call(appPath(uploadUrl), {
      method: 'PUT',
      body: new Uint8Array(size).fill(65),
      headers: { 'Content-Type': contentType },
    });
    expect(put.status).toBe(200);
    return publicUrl;
  }

  it('BUG-010 QT-06 gửi tệp đã tải lên → tin file có url; người khác trong phòng tải được', async () => {
    const { room, memTk, ownerTk } = await setup();
    const url = await uploadFile(memTk, 'chat-file', 'application/pdf', 300 * 1024);
    const clientMsgId = randomUUID();
    const attachment = { name: 'bao-cao.pdf', size: '', ext: '', url, bytes: 300 * 1024 };
    const r = await send(memTk, room, { clientMsgId, kind: 'file', attachment });
    expect(r.status).toBe(201);
    const m = chatMessageSchema.parse(await r.json());
    expect(m.attachment).toEqual({
      name: 'bao-cao.pdf',
      ext: 'PDF',
      size: '300 KB',
      bytes: 300 * 1024,
      contentType: 'application/pdf',
      url,
    });
    // S-12: gửi lại cùng clientMsgId → cùng tin
    const again = await send(memTk, room, { clientMsgId, kind: 'file', attachment });
    expect(chatMessageSchema.parse(await again.json()).id).toBe(m.id);
    // Chủ nhóm (người khác) thấy link trong lịch sử + panel File, tải đúng nội dung
    const page = chatMessagePageSchema.parse(
      await (await t.call(`/rooms/${room}/messages`, { token: ownerTk })).json(),
    );
    expect(page.items[0]?.attachment?.url).toBe(url);
    const files = z
      .object({ items: z.array(roomFileSchema) })
      .parse(await (await t.call(`/rooms/${room}/files`, { token: ownerTk })).json());
    expect(files.items[0]).toMatchObject({ name: 'bao-cao.pdf', url });
    const dl = await t.call(appPath(url));
    expect(dl.status).toBe(200);
    expect(dl.headers.get('content-disposition')).toBe('attachment');
    expect((await dl.arrayBuffer()).byteLength).toBe(300 * 1024);
    // Ảnh 2 KB qua chat-image
    const img = await uploadPng(t, memTk, 'chat-image', 2048);
    const ri = await send(memTk, room, {
      kind: 'image',
      attachment: { name: 'anh.png', size: '', ext: '', url: img, bytes: 2048 },
    });
    expect(ri.status).toBe(201);
    expect(chatMessageSchema.parse(await ri.json()).attachment).toMatchObject({
      url: img,
      ext: 'IMG',
    });
  });

  it('BUG-010 tệp của người khác / chưa tải / sai MIME / thiếu url → 400, không có tin', async () => {
    const { room, memTk, ownerTk } = await setup();
    const others = await uploadFile(ownerTk, 'chat-file', 'application/pdf', 100);
    const before = await t.prisma.db.message.count({ where: { roomId: room } });
    const bad = async (attachment: Record<string, unknown>, kind = 'file') => {
      const r = await send(memTk, room, {
        kind,
        attachment: { name: 'a.pdf', size: '', ext: '', ...attachment },
      });
      expect(r.status).toBe(400);
      return ((await r.json()) as { error: { message: string; fields?: { path: string }[] } })
        .error;
    };
    expect((await bad({ url: others })).fields?.[0]?.path).toBe('attachment');
    // Khoá của chính mình nhưng chưa PUT
    const mine = await uploadFile(memTk, 'chat-file', 'application/pdf', 100);
    const missing = mine.replace(/[^/]+$/, `${randomUUID()}.pdf`);
    expect((await bad({ url: missing })).message).toBe('Tệp chưa được tải lên');
    // Thiếu url → zod (shared) chặn trước, lỗi gắn ô attachment
    expect((await bad({})).fields?.[0]?.path).toBe('attachment');
    expect((await bad({ url: 'https://evil.example/a.pdf' })).message).toBe('Tệp không hợp lệ');
    // Tệp chat-file gửi dưới dạng ảnh → sai kind
    expect((await bad({ url: mine }, 'image')).message).toBe('Tệp không hợp lệ');
    // bytes khai lệch head().size
    expect((await bad({ url: mine, bytes: 99 })).message).toBe('Tệp không hợp lệ');
    // svg: presign từ chối luôn
    const svg = await t.call('/uploads/presign', {
      method: 'POST',
      token: memTk,
      json: { kind: 'chat-file', contentType: 'image/svg+xml', size: 100 },
    });
    expect(svg.status).toBe(400);
    expect(await t.prisma.db.message.count({ where: { roomId: room } })).toBe(before);
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
    const url = await uploadFile(memTk, 'chat-file', 'application/pdf', 1200);
    const file = { name: 'Ke-hoach.pdf', size: '', ext: '', url, bytes: 1200 };
    expect((await send(memTk, room, { kind: 'file', attachment: file })).status).toBe(201);
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

  it('REQ-209 NA-09 D-61 Portal không tạo/xoá chủ đề (route không còn → 404)', async () => {
    const { g, room, memTk, ownerTk } = await setup();
    const c = await t.call(`/groups/${g.id}/rooms`, {
      method: 'POST',
      token: ownerTk,
      json: { name: 'Hỏi đáp thuế' },
    });
    expect(c.status).toBe(404);
    expect((await t.call(`/rooms/${room}`, { method: 'DELETE', token: memTk })).status).toBe(404);
    const list = rooms.parse(
      await (await t.call(`/groups/${g.id}/rooms`, { token: memTk })).json(),
    );
    expect(list.items.map((r) => r.key)).toEqual(['general']);
  });

  it('GR-R02 REQ-362 members trả groupRole: chủ nhóm → giảng viên → thành viên', async () => {
    const { g, room, memTk } = await setup();
    const lec = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, lec.id, 'lecturer');
    const mem = roomMembersSchema.parse(
      await (await t.call(`/rooms/${room}/members`, { token: memTk })).json(),
    );
    expect(mem.items.map((m) => m.groupRole)).toEqual(['owner', 'lecturer', 'member']);
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
    expect(mem.items[0]?.groupRole).toBe('owner');
  });

  it('REQ-202 BUG-018 D-57 đọc chat khi phí active quá valid_until (job chưa chạy) → 402', async () => {
    const { room, mem, memTk } = await setup();
    expect((await t.call(`/rooms/${room}/messages?size=5`, { token: memTk })).status).toBe(200);
    const past = new Date(Date.now() - 60_000).toISOString();
    await t.app.get(AuthStateService).setFee(mem.id, { status: 'active', validUntil: past });
    expect((await t.call(`/rooms/${room}/messages?size=5`, { token: memTk })).status).toBe(402);
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
    // D-62: phiên quản trị không gửi tin Portal (sai cổng)
    expect((await send(admin, room, { body: 'x' })).status).toBe(403);
  });

  it('BUG-039 BR-13 c.mod ghim tin ghi audit; chủ nhóm ghim không ghi', async () => {
    const { room, memTk, ownerTk } = await setup();
    const m = chatMessageSchema.parse(await (await send(memTk, room, { body: 'ghim' })).json());
    const pin = (token: string, pinned: boolean) =>
      t.call(`/messages/${m.id}/pin`, { method: 'PUT', token, json: { pinned } });
    const audits = (action: string) =>
      t.prisma.db.auditLog.count({ where: { action, entity: 'message', entityId: m.id } });

    expect((await pin(ownerTk, true)).status).toBe(200);
    expect((await pin(ownerTk, false)).status).toBe(200);
    expect(await audits('chat.pin')).toBe(0);
    expect(await audits('chat.unpin')).toBe(0);

    const a = await createUser(t, { systemRole: 'admin', fee: 'active' });
    const admin = await tokenOf(t, a);
    expect(chatMessageSchema.parse(await (await pin(admin, true)).json()).pinned).toBe(true);
    expect(chatMessageSchema.parse(await (await pin(admin, false)).json()).pinned).toBe(false);
    const rows = await t.prisma.db.auditLog.findMany({
      where: { entity: 'message', entityId: m.id },
      select: { action: true, actorId: true, tag: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(rows).toEqual([
      { action: 'chat.pin', actorId: a.id, tag: 'moderation' },
      { action: 'chat.unpin', actorId: a.id, tag: 'moderation' },
    ]);
  });
});
