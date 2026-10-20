import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DashboardThreadsRepository } from '@/modules/dashboard/dashboard-threads.repository';
import { dashboardThreadsSql } from '@/modules/dashboard/dashboard-thread-sql';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ThreadFixture } from './thread-fixture';
import { flushAuthState } from '../factories/user.factory';

describe('UAT-15 indexed message-backed Dashboard storage', () => {
  let t: TestApp;
  let fixture: ThreadFixture;
  beforeAll(async () => {
    t = await createTestApp();
    fixture = new ThreadFixture(t);
    await fixture.start();
  });
  afterAll(async () => {
    await fixture.close();
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  it('UAT-15 latest50/keyset is deterministic across tied times and filters hidden/deleted/nondefault/archived roots before LIMIT', async () => {
    const f = await fixture.room();
    const nondefault = await fixture.room();
    const archived = await fixture.room();
    const at = fixture.now();
    const prefix = `feed-${randomUUID()}-`;
    const roots = Array.from({ length: 70 }, (_, i) => ({
      id: `${prefix}${String(i).padStart(3, '0')}`,
      roomId: f.roomId,
      personaId: f.persona.id,
      isSimulated: true,
      body: 'Eligible opening',
      botThreadId: `${prefix}thread-${i}`,
      botKind: 'script',
      botTurn: 0,
      botOpening: true,
      createdAt: at,
    }));
    await t.prisma.db.message.createMany({ data: roots });
    await t.prisma.db.message.createMany({
      data: [
        { id: `${prefix}hidden`, roomId: f.roomId, personaId: f.persona.id, hiddenAt: at },
        { id: `${prefix}deleted`, roomId: f.roomId, personaId: f.persona.id, deletedAt: at },
        { id: `${prefix}topic`, roomId: nondefault.roomId, personaId: nondefault.persona.id },
        { id: `${prefix}archived`, roomId: archived.roomId, personaId: archived.persona.id },
      ].map((r) => ({
        ...r,
        isSimulated: true,
        body: 'Must not crowd out a visible opening',
        botThreadId: r.id,
        botKind: 'auto',
        botTurn: 0,
        botOpening: true,
        createdAt: new Date(at.getTime() + 60000),
      })),
    });
    await t.prisma.db.room.update({ where: { id: nondefault.roomId }, data: { isDefault: false } });
    await t.prisma.db.group.update({
      where: { id: archived.group.id },
      data: { deletedAt: new Date() },
    });
    const repo = t.app.get(DashboardThreadsRepository);
    const first = await repo.page();
    const expected = roots
      .map((r) => r.id)
      .sort()
      .reverse();
    expect(first).toHaveLength(50);
    expect(first.map((r) => r.id)).toEqual(expected.slice(0, 50));
    const last = first.at(-1);
    if (!last) throw new Error('Missing first page cursor');
    const second = await repo.page({ at: last.created_at, id: last.id });
    expect(second.length).toBeLessThanOrEqual(50);
    expect(second.filter((r) => r.group_id === f.group.id).map((r) => r.id)).toEqual(
      expected.slice(50),
    );
    expect(new Set([...first, ...second].map((r) => r.id)).size).toBe(first.length + second.length);
  });

  it('UAT-15 visible response union counts execution turns and member replies once; hidden/deleted response previews never leak', async () => {
    const f = await fixture.room();
    const opening = await fixture.write(f);
    const threadId = opening.botThreadId;
    if (!threadId) throw new Error('Missing internal thread identity');
    await fixture.write(f, threadId, 1);
    const human = await fixture.replies.send(
      f.token,
      f.roomId,
      'Earliest real reply',
      randomUUID(),
      opening.id,
    );
    await t.prisma.db.message.createMany({
      data: [
        {
          id: randomUUID(),
          botTurn: 2,
          hiddenAt: null,
          deletedAt: null,
          body: 'Both relationship paths',
        },
        {
          id: randomUUID(),
          botTurn: 3,
          hiddenAt: new Date(),
          deletedAt: null,
          body: 'Hidden private response',
        },
        {
          id: randomUUID(),
          botTurn: 4,
          hiddenAt: null,
          deletedAt: new Date(),
          body: 'Deleted private response',
        },
      ].map((r) => ({
        ...r,
        roomId: f.roomId,
        personaId: f.persona.id,
        isSimulated: true,
        botThreadId: threadId,
        botKind: 'script',
        botOpening: false,
        replyToId: r.botTurn === 2 ? opening.id : null,
      })),
    });
    const row = (await t.app.get(DashboardThreadsRepository).page()).find(
      (r) => r.id === opening.id,
    );
    expect(row?.reply_count).toBe(3);
    expect(row?.reply_body).toBe('Earliest real reply');
    expect(JSON.stringify(row)).not.toContain('Hidden private response');
    expect(JSON.stringify(row)).not.toContain('Deleted private response');
    expect(
      (await t.prisma.db.message.findUniqueOrThrow({ where: { id: human.id } })).hiddenAt,
    ).toBeNull();
  });

  it('REQ-411 storage rejects incomplete/human execution metadata and a second opening for the same room/thread', async () => {
    const f = await fixture.room();
    const opening = await fixture.write(f);
    await expect(
      t.prisma.db.message.create({
        data: {
          roomId: f.roomId,
          senderId: f.user.id,
          body: 'Human cannot carry bot context',
          botThreadId: randomUUID(),
          botTurn: 0,
          botKind: 'script',
          botOpening: true,
        },
      }),
    ).rejects.toThrow();
    await expect(
      t.prisma.db.message.create({
        data: {
          roomId: f.roomId,
          personaId: f.persona.id,
          isSimulated: true,
          body: 'Incomplete context',
          botOpening: true,
        },
      }),
    ).rejects.toThrow();
    await expect(
      t.prisma.db.message.create({
        data: {
          roomId: f.roomId,
          personaId: f.persona.id,
          isSimulated: true,
          body: 'Duplicate opening',
          botThreadId: opening.botThreadId,
          botTurn: 1,
          botKind: 'script',
          botOpening: true,
        },
      }),
    ).rejects.toThrow();
  });

  it('REQ-224 UAT-15 actual query uses covering keyset IDs/deferred body joins and indexed response lookups on >20000 wide messages', async () => {
    const f = await fixture.room();
    const prefix = `thread-plan-${randomUUID()}-`;
    const at = fixture.now();
    await expect(
      t.prisma.db.$transaction(
        async (tx) => {
          await tx.$executeRaw`
        INSERT INTO messages(id,room_id,sender_id,body,created_at,updated_at)
        SELECT ${prefix} || 'human-' || n::text, ${f.roomId}, ${f.user.id}, repeat('wide human ',300), ${at},${at}
        FROM generate_series(1,10001) n`;
          await tx.$executeRaw`
        INSERT INTO messages(id,room_id,persona_id,is_simulated,body,bot_thread_id,bot_kind,bot_turn,bot_opening,created_at,updated_at)
        SELECT ${prefix} || 'continuation-' || n::text, ${f.roomId}, ${f.persona.id}, true, repeat('wide turn ',300),
          ${prefix} || 'other-' || n::text, 'script', 1, false, ${at},${at}
        FROM generate_series(1,10001) n`;
          await tx.$executeRaw`
        INSERT INTO messages(id,room_id,persona_id,is_simulated,body,bot_thread_id,bot_kind,bot_turn,bot_opening,created_at,updated_at)
        SELECT ${prefix} || 'opening-' || n::text, ${f.roomId}, ${f.persona.id}, true, repeat('wide root ',300),
          ${prefix} || 'root-' || n::text, 'script', 0, true, ${at},${at}
        FROM generate_series(1,60) n`;
          // Exercise both lookup paths and visibility selectivity, not only empty responses.
          await tx.$executeRaw`
        INSERT INTO messages(id,room_id,persona_id,is_simulated,body,bot_thread_id,bot_kind,bot_turn,created_at,updated_at)
        SELECT ${prefix} || 'visible-response-' || n::text, ${f.roomId}, ${f.persona.id}, true,
          'Visible thread response', ${prefix} || 'root-' || n::text, 'script', 1,
          ${at}::timestamptz + interval '1 millisecond', ${at}
        FROM generate_series(1,60) n`;
          await tx.$executeRaw`
        INSERT INTO messages(id,room_id,sender_id,body,reply_to_id,created_at,updated_at)
        SELECT ${prefix} || 'direct-response-' || n::text, ${f.roomId}, ${f.user.id},
          'Visible human response', ${prefix} || 'opening-' || n::text,
          ${at}::timestamptz + interval '2 milliseconds', ${at}
        FROM generate_series(1,60) n`;
          await tx.$executeRaw`
        INSERT INTO messages(id,room_id,persona_id,is_simulated,body,bot_thread_id,bot_kind,bot_turn,hidden_at,deleted_at,created_at,updated_at)
        SELECT ${prefix} || 'invisible-' || root::text || '-' || turn::text, ${f.roomId}, ${f.persona.id}, true,
          repeat('private response ',150), ${prefix} || 'root-' || root::text, 'script', turn,
          CASE WHEN turn < 52 THEN ${at}::timestamptz ELSE NULL END,
          CASE WHEN turn >= 52 THEN ${at}::timestamptz ELSE NULL END, ${at}, ${at}
        FROM generate_series(1,60) root CROSS JOIN generate_series(2,101) turn`;
          await tx.$executeRaw`ANALYZE messages`;
          const plan = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
            Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${dashboardThreadsSql()}`,
          );
          const text = plan.map((r) => r['QUERY PLAN']).join('\n');
          process.stdout.write(`UAT-15 actual >20000-row Dashboard SQL EXPLAIN:\n${text}\n`);
          expect(text).toMatch(/Index Only Scan using messages_bot_dashboard_(newest|room)_idx/);
          expect(text).toContain('messages_pkey');
          expect(text).toContain('messages_bot_thread_visible_idx');
          expect(text).toContain('messages_visible_reply_idx');
          expect(text).not.toContain('Seq Scan on messages');
          const results =
            await tx.$queryRaw<{ reply_count: number; reply_body: string }[]>(
              dashboardThreadsSql(),
            );
          expect(results).toHaveLength(50);
          expect(
            results.every(
              (row) => row.reply_count === 2 && row.reply_body === 'Visible thread response',
            ),
          ).toBe(true);
          throw new Error('Rollback Dashboard plan fixture');
        },
        { timeout: 30000 },
      ),
    ).rejects.toThrow('Rollback Dashboard plan fixture');
    expect(await t.prisma.db.message.count({ where: { id: { startsWith: prefix } } })).toBe(0);
  });
});
