import { randomUUID } from 'node:crypto';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import type { LlmProvider } from '@opchub/integrations';
import { chatMessagePageSchema } from '@opchub/shared/api-domains';
import { LLM } from '@/common/integrations';
import { BotRunnerService } from '@/modules/bot';
import { PersonaTurnWriter } from '@/modules/chat';
import { replyCooldownKey } from '@/modules/bot/services/bot-reply-cooldown.service';
import { createTestApp, type TestApp } from '../setup/test-app';
import { replyFixtures, replyValue } from './reply-fixture';
import { flushAuthState } from '../factories/user.factory';

describe('TIP-V2-502 UAT-14 member replies on native storage', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof replyFixtures>;
  const now = new Date('2026-10-21T05:00:00Z');
  let generate: MockInstance<LlmProvider['generateTurn']>;
  beforeAll(async () => {
    t = await createTestApp();
    fixture = replyFixtures(t, now);
    await fixture.start();
    generate = vi.spyOn(t.app.get<LlmProvider>(LLM), 'generateTurn');
  });
  beforeEach(async () => {
    generate.mockClear();
    await flushAuthState(t);
  });
  afterEach(async () => {
    await fixture.settings();
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await fixture.close();
    await t.close();
  });

  it('UAT-14 a real HTTP member send creates one durable event; concurrent replay schedules one delayed persona reply with indistinguishable identity', async () => {
    const f = await fixture.room();
    const key = randomUUID();
    const source = await fixture.send(f.token, f.roomId, 'Useful member question', key);
    expect((await fixture.send(f.token, f.roomId, 'Useful member question', key)).id).toBe(
      source.id,
    );
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'chat.member_sent', payload: { path: ['messageId'], equals: source.id } },
      }),
    ).toBe(1);
    const ids = await Promise.all([
      fixture.admit(source.id),
      fixture.admit(source.id),
      fixture.admit(source.id),
    ]);
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).not.toBeNull();
    const thread = await fixture.threadOf(source.id);
    expect(thread).toMatchObject({
      kind: 'reply',
      isAuto: false,
      replyRoomId: f.roomId,
      status: 'scheduled',
      cursor: 0,
      personaQueue: [f.persona.id],
    });
    expect(replyValue(thread.nextAt).getTime() - now.getTime()).toBe(5_000);
    expect(generate).not.toHaveBeenCalled();
    const runner = t.app.get(BotRunnerService);
    expect(
      await runner.postTurn(thread.id, 0, new Date(replyValue(thread.nextAt).getTime() - 1)),
    ).toBe(false);
    expect(await runner.postTurn(thread.id, 0, replyValue(thread.nextAt))).toBe(true);
    expect(await runner.postTurn(thread.id, 0, replyValue(thread.nextAt))).toBe(false);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]?.[0]).toMatchObject({
      topic: source.body,
      persona: { id: f.persona.id },
    });
    expect(generate.mock.calls[0]?.[0].history).toEqual([{ personaId: null, body: source.body }]);
    const stored = await t.prisma.db.message.findMany({
      where: { replyToId: source.id, isSimulated: true },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ personaId: f.persona.id, senderId: null });
    const response = await t.call(`/rooms/${f.roomId}/messages`, { token: f.token });
    const raw = await response.text();
    expect(raw).not.toContain('isSimulated');
    expect(raw).not.toContain('personaId');
    const page = chatMessagePageSchema.parse(JSON.parse(raw));
    expect(page.items.find((m) => m.id === replyValue(stored[0]).id)).toMatchObject({
      sender: { name: f.persona.name },
      senderRole: null,
      replyTo: { name: source.sender.name, text: source.body },
    });
    expect((await fixture.threadOf(source.id)).status).toBe('done');
  });

  it.each([{ enabled: false }, { replyToMembers: false }])(
    'REQ-411 settings %j prevent admission and generation',
    async (patch) => {
      const f = await fixture.room();
      const source = await fixture.send(f.token, f.roomId);
      await fixture.settings(patch);
      expect(await fixture.admit(source.id)).toBeNull();
      expect(await t.prisma.db.botThread.count({ where: { triggerMessageId: source.id } })).toBe(0);
      expect(generate).not.toHaveBeenCalled();
    },
  );

  it('REQ-411 runtime pause blocks admission before any provider call', async () => {
    const f = await fixture.room();
    const source = await fixture.send(f.token, f.roomId);
    await fixture.settings({ enabled: false });
    expect(await fixture.admit(source.id)).toBeNull();
    expect(generate).not.toHaveBeenCalled();
    expect(await t.prisma.db.botThread.count({ where: { triggerMessageId: source.id } })).toBe(0);
  });

  it('UAT-14 an explicitly addressed older persona outranks all ten recent speakers; generated context stays bounded', async () => {
    const f = await fixture.room();
    const other = await fixture.extraPersona(f.group.id, 'Recent speaker');
    const [older] = await t.prisma.db.$transaction((tx) =>
      t.app.get(PersonaTurnWriter).write(tx, {
        personaId: f.persona.id,
        groupIds: [f.group.id],
        body: 'Older addressed persona',
        clientMsgId: randomUUID(),
        at: new Date(Date.now() - 120_000),
      }),
    );
    expect(older).toBeDefined();
    const source = await fixture.send(
      f.token,
      f.roomId,
      'Please answer this directly',
      randomUUID(),
      replyValue(older).id,
    );
    // Ten other-persona posts arrive while the addressed member question waits for its reply.
    // Anchor to the actual HTTP timestamp, not a calendar constant that can precede that question.
    const admittedAt = new Date(Math.max(now.getTime(), Date.parse(source.createdAt)) + 20_000);
    await t.prisma.db.message.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        roomId: f.roomId,
        personaId: other.id,
        isSimulated: true,
        body: `Recent speaker ${i}`,
        createdAt: new Date(admittedAt.getTime() - 10_000 + i * 1000),
      })),
    });
    await fixture.admit(source.id, admittedAt);
    const thread = await fixture.threadOf(source.id);
    expect(thread.personaQueue).toEqual([f.persona.id]);
    expect(
      await t.app.get(BotRunnerService).postTurn(thread.id, 0, replyValue(thread.nextAt)),
    ).toBe(true);
    const context = generate.mock.calls[0]?.[0];
    expect(context?.persona.id).toBe(f.persona.id);
    expect(context?.history).toHaveLength(10);
    expect(context?.history.every((line) => line.personaId === other.id)).toBe(true);
    expect(
      await t.prisma.db.message.count({ where: { replyToId: source.id, personaId: f.persona.id } }),
    ).toBe(1);
  });

  it('REQ-411 nondefault rooms and persona messages cannot trigger a reply loop', async () => {
    const f = await fixture.room();
    const extra = await t.prisma.db.room.create({
      data: { groupId: f.group.id, name: 'Another topic', slug: 'extra' },
    });
    const source = await fixture.send(f.token, extra.id);
    expect(await fixture.admit(source.id)).toBeNull();
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'chat.member_sent', payload: { path: ['messageId'], equals: source.id } },
      }),
    ).toBe(0);
    const [personaMessage] = await t.prisma.db.$transaction((tx) =>
      t.app.get(PersonaTurnWriter).write(tx, {
        personaId: f.persona.id,
        groupIds: [f.group.id],
        body: 'Persona speaks',
        clientMsgId: randomUUID(),
        at: now,
      }),
    );
    expect(personaMessage).toBeDefined();
    expect(await fixture.admit(replyValue(personaMessage).id)).toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });

  it.each(['disabled', 'unassigned', 'outside-hours', 'quota'] as const)(
    'D-112 persona eligibility (%s) keeps membership rules but removes hours and quota gates',
    async (reason) => {
      const f = await fixture.room();
      if (reason === 'disabled')
        await t.prisma.db.persona.update({ where: { id: f.persona.id }, data: { enabled: false } });
      if (reason === 'unassigned')
        await t.prisma.db.persona.update({ where: { id: f.persona.id }, data: { groupIds: [] } });
      if (reason === 'outside-hours')
        await t.prisma.db.persona.update({
          where: { id: f.persona.id },
          data: { activeHours: '01:00 - 02:00' },
        });
      if (reason === 'quota') {
        await t.prisma.db.persona.update({ where: { id: f.persona.id }, data: { postsPerDay: 1 } });
        await t.prisma.db.message.create({
          data: {
            roomId: f.roomId,
            personaId: f.persona.id,
            isSimulated: true,
            body: 'Earlier pruned message',
            createdAt: now,
            deletedAt: now,
          },
        });
      }
      const source = await fixture.send(f.token, f.roomId);
      if (reason === 'outside-hours' || reason === 'quota') {
        expect(await fixture.admit(source.id)).not.toBeNull();
        const thread = await fixture.threadOf(source.id);
        expect(
          await t.app.get(BotRunnerService).postTurn(thread.id, 0, replyValue(thread.nextAt)),
        ).toBe(true);
        expect(generate).toHaveBeenCalledTimes(1);
        expect(
          await t.prisma.db.message.count({ where: { replyToId: source.id, isSimulated: true } }),
        ).toBe(1);
        return;
      }
      expect(await fixture.admit(source.id)).toBeNull();
      expect(await fixture.admit(source.id)).toBeNull();
      expect(
        await t.prisma.db.botActivity.count({ where: { id: `bot-reply-skip-${source.id}` } }),
      ).toBe(1);
      expect(generate).not.toHaveBeenCalled();
      await t.prisma.db.persona.update({
        where: { id: f.persona.id },
        data: {
          enabled: true,
          groupIds: [f.group.id],
          activeHours: '00:00 - 24:00',
          postsPerDay: 20,
        },
      });
      expect(await fixture.admit(source.id, new Date(now.getTime() + 60_000))).not.toBeNull();
      await fixture.threadOf(source.id);
    },
  );

  it('D-112 removes room cooldown while per-message uniqueness survives Redis loss, thread GC and hidden history', async () => {
    const f = await fixture.room();
    const one = await fixture.send(f.token, f.roomId, 'First question');
    const two = await fixture.send(f.token, f.roomId, 'Second question');
    const three = await fixture.send(f.token, f.roomId, 'Third question');
    expect(await fixture.admit(one.id)).not.toBeNull();
    expect(await fixture.admit(two.id)).toBeNull();
    expect(await fixture.admit(three.id)).toBeNull();
    const thread = await fixture.threadOf(one.id);
    expect(
      await t.app.get(BotRunnerService).postTurn(thread.id, 0, replyValue(thread.nextAt)),
    ).toBe(true);
    await t.prisma.db.botThread.delete({ where: { id: thread.id } });
    await t.redis.client.del(replyCooldownKey(f.roomId));
    const boundary = new Date(replyValue(thread.nextAt).getTime() + 1);
    expect(await fixture.admit(two.id, boundary)).not.toBeNull();
    const second = await fixture.threadOf(two.id);
    expect(replyValue(second.nextAt).getTime() - boundary.getTime()).toBe(5000);
    await t.redis.client.del(replyCooldownKey(f.roomId));
    expect(await fixture.admit(two.id, boundary)).not.toBeNull();
    await t.prisma.db.message.updateMany({
      where: { replyToId: one.id, isSimulated: true },
      data: { deletedAt: boundary },
    });
    expect(await fixture.admit(one.id, new Date(boundary.getTime() + 600_000))).toBeNull();
    expect(
      await t.prisma.db.message.count({ where: { replyToId: one.id, isSimulated: true } }),
    ).toBe(1);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('REQ-411 disabling replies pauses an admitted turn before provider use and resumes the same cursor once', async () => {
    const f = await fixture.room();
    const source = await fixture.send(f.token, f.roomId);
    await fixture.admit(source.id);
    const thread = await fixture.threadOf(source.id);
    await fixture.settings({ replyToMembers: false });
    expect(
      await t.app.get(BotRunnerService).postTurn(thread.id, 0, replyValue(thread.nextAt)),
    ).toBe(false);
    expect(generate).not.toHaveBeenCalled();
    await fixture.settings();
    expect(
      await t.app.get(BotRunnerService).postTurn(thread.id, 0, replyValue(thread.nextAt)),
    ).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it.each(['hiddenAt', 'deletedAt'] as const)(
    'REQ-411 a trigger becoming %s before its deadline skips the turn without generation',
    async (field) => {
      const f = await fixture.room();
      const source = await fixture.send(f.token, f.roomId);
      await fixture.admit(source.id);
      const thread = await fixture.threadOf(source.id);
      await t.prisma.db.message.update({ where: { id: source.id }, data: { [field]: now } });
      expect(
        await t.app.get(BotRunnerService).postTurn(thread.id, 0, replyValue(thread.nextAt)),
      ).toBe(true);
      expect((await fixture.threadOf(source.id)).status).toBe('done');
      expect(
        await t.prisma.db.message.count({ where: { replyToId: source.id, isSimulated: true } }),
      ).toBe(0);
      expect(generate).not.toHaveBeenCalled();
    },
  );
});
