import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lockBotExecution } from '@/modules/bot/repositories/execution-lock';
import { createTestApp, type TestApp } from '../setup/test-app';
import { replyFixtures } from './reply-fixture';

describe('REQ-411 reply storage invariants and native seek plans', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof replyFixtures>;
  const now = new Date('2026-10-21T05:00:00Z');
  beforeAll(async () => {
    t = await createTestApp();
    fixture = replyFixtures(t, now);
    await fixture.start();
  });
  afterAll(async () => {
    await fixture.close();
    await t.close();
  });

  it('REQ-411 DB permits only one pending reply per room and one simulated reply per trigger across personas', async () => {
    const f = await fixture.room();
    const source1 = await fixture.send(f.token, f.roomId, 'First request');
    const source2 = await fixture.send(f.token, f.roomId, 'Second request');
    const data = {
      kind: 'reply',
      replyRoomId: f.roomId,
      topic: 'Storage invariant',
      lines: [{ personaId: f.persona.id, body: '' }],
      groupIds: [f.group.id],
      nextAt: now,
    };
    const first = await t.prisma.db.botThread.create({
      data: { ...data, triggerMessageId: source1.id },
    });
    await fixture.threadOf(source1.id);
    await expect(
      t.prisma.db.botThread.create({ data: { ...data, triggerMessageId: source2.id } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await t.prisma.db.botThread.updateMany({
      where: { id: first.id, status: 'scheduled' },
      data: { status: 'done', nextAt: null },
    });
    await t.prisma.db.botThread.create({ data: { ...data, triggerMessageId: source2.id } });
    await fixture.threadOf(source2.id);
    const one = await t.prisma.db.message.create({
      data: {
        roomId: f.roomId,
        personaId: f.persona.id,
        body: 'One reply',
        isSimulated: true,
        replyToId: source1.id,
        clientMsgId: randomUUID(),
      },
    });
    const other = await fixture.extraPersona(f.group.id, 'Another persona');
    await t.prisma.db.botThread.delete({ where: { id: first.id } });
    await t.prisma.db.message.update({
      where: { id: one.id },
      data: { hiddenAt: now, deletedAt: now },
    });
    await expect(
      t.prisma.db.message.create({
        data: {
          roomId: f.roomId,
          personaId: other.id,
          body: 'Duplicate trigger',
          isSimulated: true,
          replyToId: source1.id,
          clientMsgId: randomUUID(),
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(
      await t.prisma.db.message.count({ where: { replyToId: source1.id, isSimulated: true } }),
    ).toBe(1);
  });

  it('REQ-411 room/cooldown/trigger selectors seek partial covering indexes on 10001 wide rows; persona assignment uses GIN', async () => {
    const f = await fixture.room();
    const source = await fixture.send(f.token, f.roomId);
    const prefix = `reply-plan-${randomUUID()}-`;
    await expect(
      t.prisma.db.$transaction(
        async (tx) => {
          await lockBotExecution(tx);
          await tx.$executeRaw`
        INSERT INTO bot_threads (id, topic, group_ids, lines, kind, reply_room_id, status, created_at, updated_at)
        SELECT ${prefix} || n::text, 'Reply plan', ARRAY['c1'],
          jsonb_build_array(jsonb_build_object('personaId', ${f.persona.id}::text, 'body', repeat('wide ', 300))),
          'reply', ${prefix} || n::text,
          CASE WHEN n = 1 THEN 'scheduled'::bot_thread_status ELSE 'done'::bot_thread_status END,
          ${now}, ${now} FROM generate_series(1, 10001) n`;
          await tx.$executeRaw`
        INSERT INTO messages (id, room_id, persona_id, is_simulated, body, reply_to_id, created_at, updated_at)
        SELECT ${prefix} || n::text, ${f.roomId}, ${f.persona.id}, true, repeat('wide ', 300),
          CASE WHEN n = 1 THEN ${source.id} ELSE NULL END, ${now}, ${now}
        FROM generate_series(1, 10001) n`;
          await tx.$executeRaw`
        INSERT INTO personas (id, name, enabled, group_ids, created_at, updated_at)
        SELECT ${prefix} || n::text, 'Index fixture', true,
          CASE WHEN n = 1 THEN ARRAY[${f.group.id}] ELSE ARRAY['unassigned-plan'] END,
          ${now}, ${now} FROM generate_series(1, 10001) n`;
          await tx.$executeRaw`ANALYZE bot_threads`;
          await tx.$executeRaw`ANALYZE messages`;
          await tx.$executeRaw`ANALYZE personas`;
          const pending = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>`
        EXPLAIN (ANALYZE, BUFFERS) SELECT reply_room_id FROM bot_threads WHERE kind = 'reply'
          AND reply_room_id = ${prefix + '1'} AND status IN ('scheduled', 'running') LIMIT 1`;
          const admitted = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>`
        EXPLAIN (ANALYZE, BUFFERS) SELECT created_at FROM bot_threads
        WHERE kind = 'reply' AND reply_room_id = ${prefix + '1'} ORDER BY created_at DESC, id DESC LIMIT 1`;
          const answered = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>`
        EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM messages WHERE is_simulated AND reply_to_id = ${source.id} LIMIT 1`;
          const posted = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>`
        EXPLAIN (ANALYZE, BUFFERS) SELECT created_at FROM messages WHERE room_id = ${f.roomId}
          AND is_simulated AND reply_to_id IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1`;
          const candidates = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>`
        EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM personas WHERE enabled AND group_ids @> ARRAY[${f.group.id}]`;
          const plans = [pending, admitted, answered, posted, candidates].map((rows) =>
            rows.map((row) => row['QUERY PLAN']).join('\n'),
          );
          const indexes = [
            'bot_threads_one_pending_reply_per_room',
            'bot_threads_reply_cooldown_idx',
            'messages_bot_reply_trigger_key',
            'messages_bot_reply_cooldown_idx',
            'personas_enabled_groups_idx',
          ];
          for (let i = 0; i < indexes.length; i += 1) {
            expect(plans[i]).toContain(indexes[i]);
            expect(plans[i]).not.toContain('Seq Scan');
            if (i < 4) expect(plans[i]).toContain('Index Only Scan');
          }
          process.stdout.write(`REQ-411 10001-row selectors EXPLAIN:\n${plans.join('\n')}\n`);
          throw new Error('Rollback reply plan fixture');
        },
        { timeout: 30_000 },
      ),
    ).rejects.toThrow('Rollback reply plan fixture');
    expect(await t.prisma.db.botThread.count({ where: { id: { startsWith: prefix } } })).toBe(0);
  });
});
