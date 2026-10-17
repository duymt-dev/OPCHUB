import { chatMessageSchema } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { connected, createSocketApp, nextEvent, type SocketTestApp } from '../setup/socket-app';
import { createTestApp, type TestApp } from '../setup/test-app';

type AckOk<T> = { ok: true; data: T };
type AckErr = { ok: false; error: { code: string } };

describe('Chat qua socket: room.join thật, message.send ack sau commit (TIP-B23)', () => {
  let t: TestApp;
  let s: SocketTestApp;

  beforeAll(async () => {
    t = await createTestApp();
    s = await createSocketApp();
  });
  afterAll(async () => {
    await s.close();
    await removeTestGroups(t);
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  it('A gửi → ack DTO đủ (không isSimulated), B nhận message.new; trùng clientMsgId không phát lại', async () => {
    const g = await createGroup(t);
    const room = `${g.id}-general`;
    const ua = await createUser(t, { fee: 'active' });
    const ub = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, ua.id);
    await addMember(t, g.id, ub.id);
    const a = s.connect(await tokenOf(t, ua));
    const b = s.connect(await tokenOf(t, ub));
    await Promise.all([connected(a), connected(b)]);

    // Chưa join phòng → không gửi được (cache quyền S-02)
    const early = (await a.emitWithAck('message.send', {
      roomId: room,
      clientMsgId: randomUUID(),
      body: 'sớm',
    })) as AckErr;
    expect(early).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });

    expect(((await a.emitWithAck('room.join', { roomId: room })) as { ok: boolean }).ok).toBe(true);
    expect(((await b.emitWithAck('room.join', { roomId: room })) as { ok: boolean }).ok).toBe(true);

    const got = nextEvent<unknown>(b, 'message.new');
    const clientMsgId = randomUUID();
    const ack = (await a.emitWithAck('message.send', {
      roomId: room,
      clientMsgId,
      body: 'Xin chào socket',
    })) as AckOk<unknown>;
    expect(ack.ok).toBe(true);
    const sent = chatMessageSchema.parse(ack.data);
    // Ack sau commit: tin đã nằm trong DB
    expect(await t.prisma.db.message.count({ where: { id: sent.id } })).toBe(1);
    const pushed = await got;
    expect(chatMessageSchema.parse(pushed).id).toBe(sent.id);
    expect(pushed).not.toHaveProperty('isSimulated');

    const again = (await a.emitWithAck('message.send', {
      roomId: room,
      clientMsgId,
      body: 'Xin chào socket',
    })) as AckOk<{ id: string }>;
    expect(again.data.id).toBe(sent.id);

    // Người ngoài nhóm không join được
    const outsider = s.connect(await tokenOf(t, await createUser(t, { fee: 'active' })));
    await connected(outsider);
    const denied = (await outsider.emitWithAck('room.join', { roomId: room })) as AckErr;
    expect(denied).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });

    const react = nextEvent<unknown>(a, 'message.updated');
    const r = (await b.emitWithAck('message.react', {
      messageId: sent.id,
      emoji: '👍',
    })) as AckOk<unknown>;
    expect(chatMessageSchema.parse(r.data).myReactions).toEqual(['👍']);
    expect(chatMessageSchema.parse(await react).reactions[0]?.count).toBe(1);
  });
});
