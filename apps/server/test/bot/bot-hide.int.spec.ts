import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  chatMessagePageSchema,
  chatMessageSchema,
  messageSchema,
  cursorPageSchema,
} from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { serverEvents } from '@opchub/shared/socket';
import { OutboxRelayService } from '@/common/outbox';
import { BotHidePublicationService } from '@/modules/bot';
import { BotHideService } from '@/modules/bot/services/bot-hide.service';
import { MessageService, PersonaTurnPublisher } from '@/modules/chat';
import { createTestApp, type TestApp } from '../setup/test-app';
import { connected, createSocketApp, nextEvent, type SocketTestApp } from '../setup/socket-app';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { HideFixture } from './hide-fixture';
import { replyValue } from './reply-fixture';
import { signal } from './generation-fixture';

describe('TIP-V2-502 REQ-141 hide persona messages and refresh open rooms', () => {
  let t: TestApp;
  let sockets: SocketTestApp;
  let fixture: HideFixture;
  let admin: { id: string; token: string };
  beforeAll(async () => {
    t = await createTestApp();
    sockets = await createSocketApp();
    fixture = new HideFixture(t);
    await fixture.start();
    const user = await createUser(t, {
      adminPermissions: ['bots.view', 'bots.action', 'groups.view'],
    });
    admin = { id: user.id, token: await tokenOf(t, user) };
    t.app
      .get(OutboxRelayService)
      .register('bot.messages_hidden', (payload) =>
        t.app.get(BotHidePublicationService).handle(payload),
      );
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });
  afterAll(async () => {
    await sockets.close();
    await fixture.close();
    await t.close();
  });
  const hide = (groupIds?: string[]) =>
    t.call('/admin/bot/hide-messages', {
      method: 'POST',
      token: admin.token,
      json: groupIds ? { groupIds } : {},
    });

  it('RB-R07 VIEW_ONLY/401 and malformed/empty scope/oversize bodies do not hide messages or write audit', async () => {
    const f = await fixture.room();
    const [message] = await fixture.messages(f.roomId, f.persona.id);
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['bots.view'] }));
    const count = await t.prisma.db.auditLog.count({ where: { action: 'bot.hide_messages' } });
    const denied = await t.call('/admin/bot/hide-messages', {
      method: 'POST',
      token: viewer,
      json: {},
    });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: { code: 'VIEW_ONLY' } });
    expect((await t.call('/admin/bot/hide-messages', { method: 'POST', json: {} })).status).toBe(
      401,
    );
    for (const json of [
      { groupIds: [] },
      { groupIds: [''] },
      { groupIds: 'all' },
      { typo: true },
    ]) {
      const invalid = await t.call('/admin/bot/hide-messages', {
        method: 'POST',
        token: admin.token,
        json,
      });
      expect(invalid.status).toBe(400);
      const body: unknown = await invalid.json();
      expect(body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      expect(body).toHaveProperty('error.fields');
    }
    expect(
      (
        await t.call('/admin/bot/hide-messages', {
          method: 'POST',
          token: admin.token,
          json: { groupIds: ['x'.repeat(1100000)] },
        })
      ).status,
    ).toBe(413);
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: replyValue(message).id } }))
        .hiddenAt,
    ).toBeNull();
    expect(await t.prisma.db.auditLog.count({ where: { action: 'bot.hide_messages' } })).toBe(
      count,
    );
  });

  it('REQ-141 scoped hide preserves human/unselected messages, removes hidden reply previews, retains marked Admin history and is idempotent', async () => {
    const a = await fixture.room();
    const b = await fixture.room();
    const [bot] = await fixture.messages(a.roomId, a.persona.id);
    const [other] = await fixture.messages(b.roomId, b.persona.id);
    const human = await fixture.replies.send(
      a.token,
      a.roomId,
      'Human text remains',
      randomUUID(),
      replyValue(bot).id,
    );
    const result = await hide([a.group.id, a.group.id]);
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ hidden: 1, rooms: 1 });
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: replyValue(other).id } }))
        .hiddenAt,
    ).toBeNull();
    const portal = chatMessagePageSchema.parse(
      await (await t.call(`/rooms/${a.roomId}/messages`, { token: a.token })).json(),
    );
    expect(portal.items.map((m) => m.id)).toEqual([human.id]);
    expect(portal.items[0]?.replyTo).toBeNull();
    expect(JSON.stringify(portal)).not.toContain('Private persona text');
    expect(JSON.stringify(portal)).not.toContain('isSimulated');
    const history = cursorPageSchema(messageSchema).parse(
      await (await t.call(`/rooms/${a.roomId}/messages`, { token: admin.token })).json(),
    );
    const adminMessage = replyValue(history.items.find((m) => m.id === replyValue(bot).id));
    expect(adminMessage.body).toBe('Private persona text');
    expect(typeof adminMessage.hiddenAt).toBe('string');
    const count = await t.prisma.db.outboxEvent.count({ where: { type: 'bot.messages_hidden' } });
    expect(await (await hide([a.group.id])).json()).toEqual({ hidden: 0, rooms: 0 });
    expect(await t.prisma.db.outboxEvent.count({ where: { type: 'bot.messages_hidden' } })).toBe(
      count,
    );
    expect(
      await t.prisma.db.auditLog.count({
        where: { actorId: admin.id, action: 'bot.hide_messages' },
      }),
    ).toBe(2);
    expect(await (await hide([randomUUID()])).json()).toEqual({ hidden: 0, rooms: 0 });
  });

  it('REQ-141 at exactly 200 messages, durable relay sends masked message.updated to real room sockets and replay never resurrects text', async () => {
    const f = await fixture.room();
    const messages = await fixture.messages(f.roomId, f.persona.id, 200);
    const socket = sockets.connect(f.token);
    await connected(socket);
    expect(await socket.emitWithAck('room.join', { roomId: f.roomId })).toMatchObject({ ok: true });
    const received: unknown[] = [];
    socket.on('message.updated', (raw: unknown) => received.push(raw));
    expect(await (await hide([f.group.id])).json()).toEqual({ hidden: 200, rooms: 1 });
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'bot.messages_hidden' },
      orderBy: { id: 'desc' },
    });
    const payload = parseOutboxPayload('bot.messages_hidden', event.payload);
    expect(payload.bulk).toBe(false);
    expect(payload.messageIds).toHaveLength(200);
    await t.app.get(OutboxRelayService).relayOnce();
    await expect.poll(() => received.length).toBe(200);
    expect(new Set(received.map((raw) => chatMessageSchema.parse(raw).id))).toEqual(
      new Set(messages.map((m) => m.id)),
    );
    for (const raw of received) {
      const dto = chatMessageSchema.parse(raw);
      expect(dto).toMatchObject({
        body: '',
        attachment: null,
        reactions: [],
        pinned: false,
      });
      expect(typeof dto.hiddenAt).toBe('string');
      expect(JSON.stringify(raw)).not.toContain('isSimulated');
      expect(JSON.stringify(raw)).not.toContain('Private persona text');
    }
    await t.app.get(BotHidePublicationService).handle(payload);
    await expect.poll(() => received.length).toBe(400);
    expect(await t.app.get(PersonaTurnPublisher).publish(replyValue(messages[0]).id)).toBe(false);
    socket.disconnect();
  });

  it('REQ-141 at 201 messages, emits one room.reload per affected room without sending 201 bodies', async () => {
    const f = await fixture.room();
    const other = await fixture.room();
    await fixture.messages(f.roomId, f.persona.id, 100);
    await fixture.messages(other.roomId, other.persona.id, 101);
    const socket = sockets.connect(f.token);
    const second = sockets.connect(other.token);
    await connected(socket);
    await connected(second);
    expect(await socket.emitWithAck('room.join', { roomId: f.roomId })).toMatchObject({ ok: true });
    expect(await second.emitWithAck('room.join', { roomId: other.roomId })).toMatchObject({
      ok: true,
    });
    const reloaded = nextEvent<unknown>(socket, 'room.reload');
    const otherReload = nextEvent<unknown>(second, 'room.reload');
    const reloads: unknown[] = [];
    socket.on('room.reload', (raw: unknown) => reloads.push(raw));
    second.on('room.reload', (raw: unknown) => reloads.push(raw));
    const updates: unknown[] = [];
    socket.on('message.updated', (raw: unknown) => updates.push(raw));
    expect(await (await hide([f.group.id, other.group.id])).json()).toEqual({
      hidden: 201,
      rooms: 2,
    });
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'bot.messages_hidden' },
      orderBy: { id: 'desc' },
    });
    expect(parseOutboxPayload('bot.messages_hidden', event.payload)).toMatchObject({
      bulk: true,
      messageIds: [],
    });
    expect(parseOutboxPayload('bot.messages_hidden', event.payload).roomIds.sort()).toEqual(
      [f.roomId, other.roomId].sort(),
    );
    await t.app.get(OutboxRelayService).relayOnce();
    expect(serverEvents['room.reload'].parse(await reloaded)).toEqual({ roomId: f.roomId });
    expect(serverEvents['room.reload'].parse(await otherReload)).toEqual({ roomId: other.roomId });
    expect(reloads).toHaveLength(2);
    expect(updates).toEqual([]);
    socket.disconnect();
    second.disconnect();
  });

  it('REQ-141 deletion before small-event replay reloads the entire affected room even when another hidden row still exists', async () => {
    const f = await fixture.room();
    const messages = await fixture.messages(f.roomId, f.persona.id, 2);
    const socket = sockets.connect(f.token);
    await connected(socket);
    expect(await socket.emitWithAck('room.join', { roomId: f.roomId })).toMatchObject({ ok: true });
    expect(await (await hide([f.group.id])).json()).toEqual({ hidden: 2, rooms: 1 });
    await t.prisma.db.message.delete({ where: { id: replyValue(messages[0]).id } });
    const reloaded = nextEvent<unknown>(socket, 'room.reload');
    await t.app.get(OutboxRelayService).relayOnce();
    expect(serverEvents['room.reload'].parse(await reloaded)).toEqual({ roomId: f.roomId });
    socket.disconnect();
  });

  it('REQ-141 hide fences a publication which read the visible DTO before the hide commit', async () => {
    const f = await fixture.room();
    const [bot] = await fixture.messages(f.roomId, f.persona.id);
    const started = signal<void>();
    const release = signal<void>();
    t.app.get(MessageService).onSent(async (m) => {
      if (m.id !== replyValue(bot).id) return;
      started.resolve();
      await release.promise;
    });
    const publishing = t.app.get(PersonaTurnPublisher).publish(replyValue(bot).id);
    try {
      await started.promise;
      expect(await (await hide([f.group.id])).json()).toEqual({ hidden: 1, rooms: 1 });
    } finally {
      release.resolve();
    }
    expect(await publishing).toBe(false);
    expect(await t.redis.client.hget('chat:seq', f.roomId)).toBeNull();
  });

  it('REQ-141 audit failure rolls back the actual bulk visibility change and outbox', async () => {
    const f = await fixture.room();
    const messages = await fixture.messages(f.roomId, f.persona.id, 2);
    const count = await t.prisma.db.outboxEvent.count({ where: { type: 'bot.messages_hidden' } });
    await expect(
      t.app.get(BotHideService).hide({ id: admin.id, ip: 'invalid-audit-inet' }, [f.group.id]),
    ).rejects.toThrow();
    expect(
      await t.prisma.db.message.count({
        where: { id: { in: messages.map((m) => m.id) }, hiddenAt: null },
      }),
    ).toBe(2);
    expect(await t.prisma.db.outboxEvent.count({ where: { type: 'bot.messages_hidden' } })).toBe(
      count,
    );
  });

  it('REQ-141 missing groupIds hides all remaining simulated messages including soft-deleted ones, never human messages', async () => {
    const f = await fixture.room();
    const [bot] = await fixture.messages(f.roomId, f.persona.id);
    await t.prisma.db.message.update({
      where: { id: replyValue(bot).id },
      data: { deletedAt: new Date() },
    });
    const human = await fixture.replies.send(f.token, f.roomId, 'Human survives global hide');
    const remaining = await t.prisma.db.message.count({
      where: { isSimulated: true, hiddenAt: null },
    });
    const result = await hide();
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ hidden: remaining });
    expect(await t.prisma.db.message.count({ where: { isSimulated: true, hiddenAt: null } })).toBe(
      0,
    );
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: human.id } })).hiddenAt,
    ).toBeNull();
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: replyValue(bot).id } })).hiddenAt,
    ).not.toBeNull();
  });
});
