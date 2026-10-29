import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OutboxRelayService } from '@/common/outbox';
import { BULL_PREFIX, WorkerFactory } from '@/common/queue';
import { FEED } from '@/common/realtime/live-counter-keys';
import {
  ROOM_EVENTS_CHANNEL,
  roomEventEnvelopeSchema,
  type RoomEventEnvelope,
} from '@/common/realtime/room-events.publisher';
import {
  ChatCoreModule,
  MessageService,
  PersonaTurnPublisher,
  PersonaTurnWriter,
} from '@/modules/chat';
import { personaDeliveredKey } from '@/modules/chat/services/persona-publication-script';
import { ModerationCoreModule } from '@/modules/moderation';
import { BotPublicationProcessor } from '@/worker/processors/bot-publication.processor';
import { ModerationProcessor } from '@/worker/processors/moderation.processor';
import { createGroup } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-208 REQ-207 durable persona publication via real worker', () => {
  let t: TestApp;
  let queue: Queue;
  let moderation: Queue;
  let stopSubscription: () => Promise<void>;
  const groups: string[] = [];
  const personas: string[] = [];
  const messages: string[] = [];
  const events: RoomEventEnvelope[] = [];

  beforeAll(async () => {
    t = await createTestApp({
      imports: [ChatCoreModule, ModerationCoreModule],
      providers: [BotPublicationProcessor, ModerationProcessor],
    });
    queue = new Queue('bot', {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
    moderation = new Queue('moderation', {
      connection: t.redis.duplicate({ prefix: '' }),
      prefix: BULL_PREFIX,
    });
    const subscriber = t.redis.duplicate({ prefix: '' });
    subscriber.on('message', (_channel, body: string) => {
      const raw: unknown = JSON.parse(body);
      events.push(roomEventEnvelopeSchema.parse(raw));
    });
    await subscriber.subscribe(t.redis.channel(ROOM_EVENTS_CHANNEL));
    stopSubscription = async () => {
      await subscriber.quit();
    };
  });

  afterAll(async () => {
    await t.app.get(WorkerFactory).onApplicationShutdown();
    await stopSubscription();
    await Promise.all(
      messages.map(async (id) => {
        await (await queue.getJob(`bot-publish-${id}`))?.remove();
        await (await moderation.getJob(`kw-${id}`))?.remove();
      }),
    );
    await queue.close();
    await moderation.close();
    if (messages.length)
      await t.prisma.db.outboxEvent.deleteMany({
        where: {
          type: 'bot.turn_posted',
          OR: messages.map((id) => ({ payload: { path: ['messageId'], equals: id } })),
        },
      });
    await t.prisma.db.group.deleteMany({ where: { id: { in: groups } } });
    await t.prisma.db.persona.deleteMany({ where: { id: { in: personas } } });
    if (groups.length) {
      await t.redis.client.del(...groups.map((id) => personaDeliveredKey(`${id}-general`)));
      await t.redis.client.hdel('chat:seq', ...groups.map((id) => `${id}-general`));
    }
    await t.close();
  });

  async function fixture(body = 'Tin persona thử nghiệm') {
    const group = await createGroup(t);
    groups.push(group.id);
    const personaId = randomUUID();
    personas.push(personaId);
    await t.prisma.db.persona.create({
      data: { id: personaId, name: 'Persona tích hợp', groupIds: [group.id] },
    });
    const rows = await t.prisma.db.$transaction((tx) =>
      t.app.get(PersonaTurnWriter).write(tx, {
        personaId,
        groupIds: [group.id],
        clientMsgId: randomUUID(),
        body,
        at: new Date(),
      }),
    );
    const message = rows[0];
    if (!message) throw new Error('Missing persona turn fixture');
    messages.push(message.id);
    return message;
  }

  async function drain(messageId: string) {
    await t.app.get(OutboxRelayService).relayOnce();
    await expect
      .poll(async () => (await queue.getJob(`bot-publish-${messageId}`))?.getState(), {
        timeout: 15_000,
      })
      .toBe('completed');
  }

  const received = (messageId: string) =>
    events.filter((event) => event.event === 'message.new' && event.data.id === messageId);

  it('REQ-208 outbox -> bot worker -> socket DTO with no simulated identity field', async () => {
    const message = await fixture();
    await drain(message.id);
    await expect.poll(() => received(message.id).length).toBe(1);
    const packet = received(message.id)[0];
    if (!packet || packet.event !== 'message.new') throw new Error('Missing socket message');
    expect(packet.data.body).toBe('Tin persona thử nghiệm');
    expect(packet.data).not.toHaveProperty('isSimulated');
    expect(packet.data).not.toHaveProperty('personaId');
  });

  it('REQ-207 D-117 B4 keyword hit: not published, keyword worker hides it, no violation', async () => {
    const keyword = await t.prisma.db.moderationKeyword.findFirst({ select: { word: true } });
    if (!keyword) throw new Error('Missing seeded moderation keyword');
    const message = await fixture(`Kiểm thử từ khóa: ${keyword.word}`);
    await drain(message.id);
    // D-117 B4: tin trúng từ khoá không phát nguyên văn cho phòng
    expect(received(message.id)).toEqual([]);
    await expect
      .poll(
        () =>
          t.prisma.db.report.count({
            where: { messageId: message.id, source: 'auto', status: 'open' },
          }),
        { timeout: 10_000 },
      )
      .toBe(1);
    // V4-612 (D-77): trúng từ khoá → ẩn ngay; tin persona (không người gửi) không tính vi phạm
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: message.id } })).hiddenAt,
    ).toBeInstanceOf(Date);
    expect(await t.prisma.db.moderationViolation.count({ where: { messageId: message.id } })).toBe(
      0,
    );
  });

  it('REQ-208 concurrent publication replay increments unread/feed once and does not republish the message', async () => {
    const message = await fixture();
    const publisher = t.app.get(PersonaTurnPublisher);
    const results = await Promise.all([
      publisher.publish(message.id),
      publisher.publish(message.id),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    await expect.poll(() => received(message.id).length).toBe(1);
    expect(await t.redis.client.hget('chat:seq', message.roomId)).toBe('1');
    expect(
      events.filter(
        (event) => event.event === 'unread.bump' && event.data.roomId === message.roomId,
      ),
    ).toHaveLength(1);
    const activities = await t.redis.client.lrange(FEED, 0, -1);
    expect(activities.filter((item) => item.includes(`msg:${message.id}`))).toHaveLength(1);
  });

  it('REQ-207 failed durable sent hook retries in BullMQ before publishing, without duplicated counters', async () => {
    const message = await fixture();
    let attempts = 0;
    t.app.get(MessageService).onSent((item) => {
      if (item.id === message.id && ++attempts === 1)
        return Promise.reject(new Error('Injected durable hook failure'));
      return Promise.resolve();
    });
    await drain(message.id);
    expect(attempts).toBe(2);
    await expect.poll(() => received(message.id).length).toBe(1);
    expect(await t.redis.client.hget('chat:seq', message.roomId)).toBe('1');
  });

  it('REQ-208 cache type failure changes no counters or delivery marker; repair and retry publishes once', async () => {
    const message = await fixture();
    const key = personaDeliveredKey(message.roomId);
    await t.redis.client.set(key, 'wrong-type-fixture');
    await expect(t.app.get(PersonaTurnPublisher).publish(message.id)).rejects.toThrow(
      'Invalid persona publication cache type',
    );
    expect(await t.redis.client.hget('chat:seq', message.roomId)).toBeNull();
    expect(received(message.id)).toHaveLength(0);
    await t.redis.client.del(key);
    expect(await t.app.get(PersonaTurnPublisher).publish(message.id)).toBe(true);
    expect(await t.app.get(PersonaTurnPublisher).publish(message.id)).toBe(false);
    expect(await t.redis.client.hget('chat:seq', message.roomId)).toBe('1');
  });

  it('REQ-208 hidden or deleted turns are not exposed when their outbox is delayed', async () => {
    const message = await fixture();
    await t.prisma.db.message.update({ where: { id: message.id }, data: { hiddenAt: new Date() } });
    expect(await t.app.get(PersonaTurnPublisher).publish(message.id)).toBe(false);
    await t.prisma.db.message.update({
      where: { id: message.id },
      data: { hiddenAt: null, deletedAt: new Date() },
    });
    expect(await t.app.get(PersonaTurnPublisher).publish(message.id)).toBe(false);
    expect(received(message.id)).toHaveLength(0);
    expect(await t.redis.client.hget('chat:seq', message.roomId)).toBeNull();
  });

  it('REQ-208 delivery markers stay bounded to 120 retained timestamp/id entries per room', async () => {
    const message = await fixture();
    const key = personaDeliveredKey(message.roomId);
    const time = Date.now() - 1000;
    const pipe = t.redis.client.pipeline();
    for (let i = 1; i <= 120; i += 1) pipe.zadd(key, time - i, `pruned-fixture-${i}`);
    await pipe.exec();
    expect(await t.app.get(PersonaTurnPublisher).publish(message.id)).toBe(true);
    expect(await t.redis.client.zcard(key)).toBe(120);
    expect(await t.redis.client.zscore(key, message.id)).not.toBeNull();
    expect(await t.redis.client.zscore(key, 'pruned-fixture-120')).toBeNull();
  });
});
