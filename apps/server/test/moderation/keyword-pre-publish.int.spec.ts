import { chatMessageSchema } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ROOM_EVENTS_CHANNEL,
  roomEventEnvelopeSchema,
  type RoomEventEnvelope,
} from '@/common/realtime/room-events.publisher';
import { PersonaMessageService } from '@/modules/chat';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** TIP-V42-701 B4 (D-77, D-117): tin trúng từ khoá lưu ẩn ngay, phòng không nhận nguyên văn */
describe('Kiểm từ khoá trước khi phát tin (TIP-V42-701 B4)', () => {
  let t: TestApp;
  const events: RoomEventEnvelope[] = [];
  let stop: () => Promise<void> = () => Promise.resolve();

  beforeAll(async () => {
    t = await createTestApp();
    const sub = t.redis.duplicate({ prefix: '' });
    sub.on('message', (_channel, body: string) => {
      events.push(roomEventEnvelopeSchema.parse(JSON.parse(body) as unknown));
    });
    await sub.subscribe(t.redis.channel(ROOM_EVENTS_CHANNEL));
    stop = async () => {
      await sub.quit();
    };
  });
  afterAll(async () => {
    await stop();
    await removeTestGroups(t);
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
    events.length = 0;
  });

  const settle = () => new Promise((r) => setTimeout(r, 300));
  const bodiesOf = (roomId: string) =>
    events
      .filter((e) => 'roomId' in e && e.roomId === roomId && e.event === 'message.new')
      .map((e) => JSON.stringify(e.data));

  it('tin thành viên trúng từ khoá: lưu hidden_at, phát dòng ẩn rỗng, người gửi nhận hiddenAt', async () => {
    const g = await createGroup(t);
    const room = `${g.id}-general`;
    const u = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, u.id);
    const res = await t.call(`/rooms/${room}/messages`, {
      method: 'POST',
      token: await tokenOf(t, u),
      json: { clientMsgId: randomUUID(), body: 'Ai cần VAY NÓNG liên hệ mình' },
    });
    const m = chatMessageSchema.parse(await res.json());
    expect(m.hiddenAt).toBeTruthy();
    expect(m.body).toBe('');
    const row = await t.prisma.db.message.findUniqueOrThrow({
      where: { id: m.id },
      select: { hiddenAt: true, body: true },
    });
    expect(row.hiddenAt).not.toBeNull();
    expect(row.body).toBe('Ai cần VAY NÓNG liên hệ mình');
    await settle();
    const sent = bodiesOf(room);
    expect(sent.length).toBe(1);
    expect(sent.join()).not.toMatch(/VAY NÓNG/i);
    // Hook sau commit vẫn tạo job kiểm duyệt (ca auto + tính vi phạm)
    const raw = t.redis.duplicate({ prefix: '' });
    expect(await raw.exists(`opchub:bull:moderation:kw-${m.id}`)).toBe(1);
    await raw.quit();
  });

  it('tin sạch vẫn phát nguyên văn, không ẩn', async () => {
    const g = await createGroup(t);
    const room = `${g.id}-general`;
    const u = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, u.id);
    const res = await t.call(`/rooms/${room}/messages`, {
      method: 'POST',
      token: await tokenOf(t, u),
      json: { clientMsgId: randomUUID(), body: 'Chào cả nhóm' },
    });
    const m = chatMessageSchema.parse(await res.json());
    expect(m.hiddenAt ?? null).toBeNull();
    await settle();
    expect(bodiesOf(room).join()).toMatch(/Chào cả nhóm/);
  });

  it('tin bot trúng từ khoá: không phát message.new, job kiểm duyệt vẫn được enqueue', async () => {
    const g = await createGroup(t);
    const room = `${g.id}-general`;
    const personaId = `ps-kw-${randomUUID().slice(0, 8)}`;
    await t.prisma.db.persona.create({ data: { id: personaId, name: 'Persona lọc trước' } });
    try {
      const n = await t.app
        .get(PersonaMessageService)
        .post(`kw-${randomUUID()}`, [g.id], [{ personaId, body: 'Có ai cần vay nóng không' }]);
      expect(n).toBe(1);
      await settle();
      expect(bodiesOf(room)).toEqual([]);
      const m = await t.prisma.db.message.findFirstOrThrow({
        where: { roomId: room, personaId },
        select: { id: true },
      });
      const raw = t.redis.duplicate({ prefix: '' });
      expect(await raw.exists(`opchub:bull:moderation:kw-${m.id}`)).toBe(1);
      await raw.quit();
    } finally {
      await t.prisma.db.message.deleteMany({ where: { personaId } });
      await t.prisma.db.persona.deleteMany({ where: { id: personaId } });
    }
  });
});
