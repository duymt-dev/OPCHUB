import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PersonaTurnWriter, type PersonaTurnInput } from '@/modules/chat';
import { personaTurnPruneSql } from '@/modules/chat/repositories/persona-turn-prune';
import { withRolledBackMessages } from './persona-plan-fixture';
import { createGroup } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-208 REQ-411 atomic persona turn storage', () => {
  let t: TestApp;
  let writer: PersonaTurnWriter;
  const groups: string[] = [];
  const personas: string[] = [];
  const messages: string[] = [];
  const noiseUsers: string[] = [];
  const at = new Date('2026-10-21T05:00:00Z');

  beforeAll(async () => {
    t = await createTestApp();
    writer = t.app.get(PersonaTurnWriter);
  });
  afterAll(async () => {
    if (messages.length)
      await t.prisma.db.outboxEvent.deleteMany({
        where: {
          type: 'bot.turn_posted',
          OR: messages.map((id) => ({ payload: { path: ['messageId'], equals: id } })),
        },
      });
    await t.prisma.db.group.deleteMany({ where: { id: { in: groups } } });
    await t.prisma.db.persona.deleteMany({ where: { id: { in: personas } } });
    await t.prisma.db.user.deleteMany({ where: { id: { in: noiseUsers } } });
    await t.close();
  });

  async function fixture(count = 1): Promise<PersonaTurnInput> {
    const made = await Promise.all(Array.from({ length: count }, () => createGroup(t)));
    const ids = made.map((group) => group.id);
    groups.push(...ids);
    const id = randomUUID();
    personas.push(id);
    await t.prisma.db.persona.create({ data: { id, name: 'Persona thử', groupIds: ids } });
    return { personaId: id, groupIds: ids, clientMsgId: randomUUID(), body: 'Xin chào', at };
  }

  async function write(input: PersonaTurnInput) {
    const rows = await t.prisma.db.$transaction((tx) => writer.write(tx, input));
    messages.push(...rows.map((row) => row.id));
    return rows;
  }

  it('REQ-208 records one turn per assigned default room with actual count and a durable publication for each', async () => {
    const input = await fixture(2);
    const rows = await write({ ...input, body: '<b>Xin chào</b>' });
    expect(rows).toHaveLength(2);
    expect(
      await t.prisma.db.message.count({
        where: {
          id: { in: rows.map((row) => row.id) },
          body: 'Xin chào',
          isSimulated: true,
          senderId: null,
        },
      }),
    ).toBe(2);
    expect(
      (await t.prisma.db.persona.findUniqueOrThrow({ where: { id: input.personaId } })).postCount,
    ).toBe(2);
    const events = await t.prisma.db.outboxEvent.findMany({
      where: {
        type: 'bot.turn_posted',
        OR: rows.map((row) => ({ payload: { path: ['messageId'], equals: row.id } })),
      },
      select: { payload: true },
    });
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.payload)).toEqual(
      expect.arrayContaining(rows.map((row) => ({ messageId: row.id }))),
    );
  });

  it('REQ-208 S-12 parallel replay posts/counts/emits exactly once', async () => {
    const input = await fixture();
    const results = await Promise.all([write(input), write(input)]);
    expect(results.flat()).toHaveLength(1);
    expect(
      await t.prisma.db.message.count({
        where: { clientMsgId: input.clientMsgId, personaId: input.personaId },
      }),
    ).toBe(1);
    expect(
      (await t.prisma.db.persona.findUniqueOrThrow({ where: { id: input.personaId } })).postCount,
    ).toBe(1);
    const postedId = results.flat()[0]?.id;
    if (!postedId) throw new Error('Expected a posted message');
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'bot.turn_posted', payload: { path: ['messageId'], equals: postedId } },
      }),
    ).toBe(1);
  });

  it('REQ-208 partial room retry increments only newly inserted messages, not attempted rooms', async () => {
    const input = await fixture(2);
    expect(await write({ ...input, groupIds: input.groupIds.slice(0, 1) })).toHaveLength(1);
    expect(await write(input)).toHaveLength(1);
    expect(await write(input)).toHaveLength(0);
    expect(
      (await t.prisma.db.persona.findUniqueOrThrow({ where: { id: input.personaId } })).postCount,
    ).toBe(2);
    expect(
      await t.prisma.db.message.count({
        where: { personaId: input.personaId, clientMsgId: input.clientMsgId },
      }),
    ).toBe(2);
  });

  it('REQ-208 caller rollback removes messages, counter increment and outbox together', async () => {
    const input = await fixture();
    let ids: string[] = [];
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        ids = (await writer.write(tx, input)).map((row) => row.id);
        throw new Error('rollback fixture');
      }),
    ).rejects.toThrow('rollback fixture');
    expect(await t.prisma.db.message.count({ where: { clientMsgId: input.clientMsgId } })).toBe(0);
    expect(
      (await t.prisma.db.persona.findUniqueOrThrow({ where: { id: input.personaId } })).postCount,
    ).toBe(0);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: {
          type: 'bot.turn_posted',
          OR: ids.map((id) => ({ payload: { path: ['messageId'], equals: id } })),
        },
      }),
    ).toBe(0);
  });

  it('REQ-208 disabled or unassigned personas cannot write, and rich-text-only content is rejected', async () => {
    const input = await fixture();
    await t.prisma.db.persona.update({ where: { id: input.personaId }, data: { enabled: false } });
    expect(await write(input)).toHaveLength(0);
    await t.prisma.db.persona.update({
      where: { id: input.personaId },
      data: { enabled: true, groupIds: [] },
    });
    expect(await write(input)).toHaveLength(0);
    await expect(write({ ...input, body: '<script>bad()</script>' })).rejects.toThrow();
  });

  it('REQ-411 reply target must be visible and in the same room', async () => {
    const input = await fixture(2);
    const user = await createUser(t, { fee: 'active' });
    const target = await t.prisma.db.message.create({
      data: {
        roomId: `${input.groupIds[0]}-general`,
        senderId: user.id,
        body: 'Cho mình hỏi',
        kind: 'text',
      },
    });
    const rows = await write({ ...input, replyToId: target.id });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.roomId).toBe(target.roomId);
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: rows[0]?.id ?? '' } })).replyToId,
    ).toBe(target.id);
    await t.prisma.db.message.update({ where: { id: target.id }, data: { hiddenAt: at } });
    expect(await write({ ...input, clientMsgId: randomUUID(), replyToId: target.id })).toHaveLength(
      0,
    );
  });

  it('REQ-208 prune after a turn keeps exactly 120 simulated messages and leaves member messages untouched', async () => {
    const input = await fixture();
    const roomId = `${input.groupIds[0]}-general`;
    const user = await createUser(t, { fee: 'active' });
    const member = await t.prisma.db.message.create({
      data: { roomId, senderId: user.id, body: 'Tin người thật', kind: 'text' },
    });
    await t.prisma.db.$executeRaw`
      INSERT INTO messages (id, room_id, persona_id, is_simulated, kind, body, created_at, updated_at)
      SELECT gen_random_uuid()::text, ${roomId}, ${input.personaId}, true, 'text', 'old',
        ${at}::timestamptz - interval '1 hour' + n * interval '1 second', ${at}
      FROM generate_series(1, 120) n`;
    await write(input);
    expect(
      await t.prisma.db.message.count({ where: { roomId, isSimulated: true, deletedAt: null } }),
    ).toBe(120);
    expect(
      await t.prisma.db.message.count({
        where: { roomId, isSimulated: true, deletedAt: { not: null } },
      }),
    ).toBe(1);
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: member.id } })).deletedAt,
    ).toBeNull();
  });

  it('REQ-208 exact prune query seeks the partial index before PK updates with more than 10k messages', async () => {
    const input = await fixture(3);
    const roomId = `${input.groupIds[0]}-general`;
    const secondRoom = `${input.groupIds[1]}-general`;
    const otherRoom = `${input.groupIds[2]}-general`;
    const member = await createUser(t, { fee: 'active' });
    noiseUsers.push(member.id);
    await withRolledBackMessages(t, async (db) => {
      await db.$executeRaw`
      INSERT INTO messages (id, room_id, persona_id, is_simulated, kind, body, created_at, updated_at)
      SELECT gen_random_uuid()::text, CASE WHEN n <= 121 THEN ${roomId} WHEN n <= 242 THEN ${secondRoom} ELSE ${otherRoom} END,
        ${input.personaId}, true, 'text', 'query-plan-fixture',
        ${at}::timestamptz - interval '1 day' + n * interval '1 millisecond', ${at}
      FROM generate_series(1, 10242) n`;
      // A partial index needs a mixed workload to exercise its selectivity. Preserve all
      // 10,242 original simulated rows and add member traffic outside the target rooms.
      await db.$executeRaw`
      INSERT INTO messages (id, room_id, sender_id, is_simulated, kind, body, created_at, updated_at)
      SELECT gen_random_uuid()::text, ${otherRoom}, ${member.id}, false, 'text', 'member-plan-noise',
        ${at}::timestamptz - interval '1 day' + n * interval '1 millisecond', ${at}
      FROM generate_series(1, 10000) n`;
      await db.$executeRaw`ANALYZE messages`;
      const plan = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`
      EXPLAIN (ANALYZE, BUFFERS) ${personaTurnPruneSql([roomId, secondRoom], at)}`);
      const text = plan.map((row) => row['QUERY PLAN']).join('\n');
      expect(text).toContain('messages_simulated_room_idx');
      expect(text).toContain('messages_pkey');
      expect(text).not.toMatch(/Seq Scan on messages/);
      expect(await db.message.count({ where: { roomId, deletedAt: null } })).toBe(120);
      expect(await db.message.count({ where: { roomId: secondRoom, deletedAt: null } })).toBe(120);
      expect(
        await db.message.count({
          where: { roomId: otherRoom, isSimulated: false, deletedAt: null },
        }),
      ).toBe(10000);
      process.stdout.write(`REQ-208 exact prune EXPLAIN on 20242 mixed rows:\n${text}\n`);
    });
  });

  it('REQ-208 all-simulated skew still prunes through indexed PK updates without scanning messages', async () => {
    const input = await fixture(3);
    const roomId = `${input.groupIds[0]}-general`;
    const secondRoom = `${input.groupIds[1]}-general`;
    const otherRoom = `${input.groupIds[2]}-general`;
    await withRolledBackMessages(t, async (db) => {
      await db.$executeRaw`
      INSERT INTO messages (id, room_id, persona_id, is_simulated, kind, body, created_at, updated_at)
      SELECT gen_random_uuid()::text, CASE WHEN n <= 121 THEN ${roomId} WHEN n <= 242 THEN ${secondRoom} ELSE ${otherRoom} END,
        ${input.personaId}, true, 'text', 'all-simulated-plan-fixture',
        ${at}::timestamptz - interval '1 day' + n * interval '1 millisecond', ${at}
      FROM generate_series(1, 10242) n`;
      await db.$executeRaw`ANALYZE messages`;
      const plan = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`
      EXPLAIN (ANALYZE, BUFFERS) ${personaTurnPruneSql([roomId, secondRoom], at)}`);
      const text = plan.map((row) => row['QUERY PLAN']).join('\n');
      expect(text).toContain('messages_pkey');
      expect(text).not.toMatch(/Seq Scan on messages/);
      expect(await db.message.count({ where: { roomId, deletedAt: null } })).toBe(120);
      expect(await db.message.count({ where: { roomId: secondRoom, deletedAt: null } })).toBe(120);
      expect(await db.message.count({ where: { roomId: otherRoom, deletedAt: null } })).toBe(10000);
      process.stdout.write(`REQ-208 all-simulated EXPLAIN on 10242 rows:\n${text}\n`);
    });
  });
});
