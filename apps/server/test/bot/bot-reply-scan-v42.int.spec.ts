import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma, createPrismaClient } from '@opchub/db';
import { loadEnv } from '@/common/config';
import { BotReplyScanService } from '@/modules/chat';
import {
  botReplyScanSql,
  botReplyHistorySql,
} from '@/modules/chat/repositories/bot-reply-scan.repository';
import { createTestApp, type TestApp } from '../setup/test-app';
import { replyFixtures } from './reply-fixture';
import { flushAuthState } from '../factories/user.factory';

describe('D-112 native latest-N reply candidate scan', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof replyFixtures>;
  let scan: BotReplyScanService;
  const now = new Date('2026-10-28T05:00:00Z');
  beforeAll(async () => {
    t = await createTestApp();
    fixture = replyFixtures(t, now);
    await fixture.start();
    scan = t.app.get(BotReplyScanService);
  });
  afterAll(async () => {
    await fixture.close();
    await t.close();
  });
  // Repeated fixture runs share Redis DB2, not a production authentication session.
  beforeEach(async () => {
    await flushAuthState(t);
  });

  it('limits before eligibility, excludes files/hidden/deleted/bot messages, never reaches older matches', async () => {
    const f = await fixture.room();
    const ids = Array.from({ length: 7 }, () => randomUUID());
    await t.prisma.db.message.createMany({
      data: ids.map((id, i) => ({
        id,
        roomId: f.roomId,
        senderId: i === 6 ? null : f.user.id,
        personaId: i === 6 ? f.persona.id : null,
        isSimulated: i === 6,
        body: `Candidate ${i}`,
        kind: i === 3 ? 'file' : 'text',
        attachment: i === 3 ? { name: 'test.pdf', size: '1 KB', ext: 'pdf' } : Prisma.DbNull,
        hiddenAt: i === 4 ? now : null,
        deletedAt: i === 5 ? now : null,
        createdAt: new Date(now.getTime() + i * 1000),
      })),
    });
    const all = await scan.candidates(t.prisma.db, 7);
    expect(all.find((row) => row.groupId === f.group.id)?.messageIds).toEqual(ids.slice(0, 3));
    const latest = await scan.candidates(t.prisma.db, 5);
    expect(latest.find((row) => row.groupId === f.group.id)?.messageIds).toEqual(ids.slice(2, 3));
    const noMatches = await scan.candidates(t.prisma.db, 4);
    expect(noMatches.some((row) => row.groupId === f.group.id)).toBe(false);
  });

  it('excludes already answered messages even when the reply is hidden, and ignores other topics/deleted groups', async () => {
    const f = await fixture.room();
    const source = await t.prisma.db.message.create({
      data: { roomId: f.roomId, senderId: f.user.id, body: 'Answered' },
    });
    await t.prisma.db.message.create({
      data: {
        roomId: f.roomId,
        personaId: f.persona.id,
        body: 'Hidden answer',
        isSimulated: true,
        replyToId: source.id,
        hiddenAt: now,
      },
    });
    const other = await t.prisma.db.room.create({
      data: { groupId: f.group.id, slug: randomUUID(), name: 'Another topic' },
    });
    await t.prisma.db.message.create({
      data: { roomId: other.id, senderId: f.user.id, body: 'Non-default room' },
    });
    expect((await scan.candidates(t.prisma.db, 50)).some((row) => row.groupId === f.group.id)).toBe(
      false,
    );
    await t.prisma.db.message.create({
      data: { roomId: f.roomId, senderId: f.user.id, body: 'New candidate' },
    });
    expect(
      (await scan.candidates(t.prisma.db, 50)).find((row) => row.groupId === f.group.id)?.pending,
    ).toBe(1);
    await t.prisma.db.group.update({ where: { id: f.group.id }, data: { deletedAt: now } });
    expect((await scan.candidates(t.prisma.db, 50)).some((row) => row.groupId === f.group.id)).toBe(
      false,
    );
  });

  it('ranks by pending count, loads only eight newest preview bodies, and seeks indexes with 10000 wide rows', async () => {
    const f = await fixture.room();
    const prefix = randomUUID();
    const tx = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    try {
      await tx.$executeRaw`BEGIN`;
      await tx.$executeRaw`
      INSERT INTO messages (id, room_id, sender_id, kind, body, created_at, updated_at)
      SELECT ${prefix} || '-' || n::text, ${f.roomId}, ${f.user.id}, 'text', repeat('x', 2000),
        ${now}::timestamptz + n * interval '1 second', ${now}
      FROM generate_series(1, 10000) n`;
      await tx.$executeRaw`ANALYZE messages`;
      const rows = await scan.candidates(tx, 50);
      const own = rows.find((row) => row.groupId === f.group.id);
      expect(own?.pending).toBe(50);
      expect(own?.messageIds).toHaveLength(50);
      expect(own?.messageIds[0]).toBe(`${prefix}-9951`);
      expect(own?.messageIds.at(-1)).toBe(`${prefix}-10000`);
      expect(rows.every((row, i) => i === 0 || (rows[i - 1]?.pending ?? 0) >= row.pending)).toBe(
        true,
      );
      const overview = await scan.overview(tx, 50);
      expect(overview.groups.length).toBeLessThanOrEqual(10);
      const preview = overview.groups.find((row) => row.groupId === f.group.id)?.preview;
      expect(preview).toHaveLength(8);
      expect(preview?.[0]?.id).toBe(`${prefix}-10000`);
      const plan = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`
      EXPLAIN (ANALYZE, BUFFERS) ${botReplyScanSql(50)}`);
      const text = plan.map((row) => row['QUERY PLAN']).join('\n');
      process.stdout.write(`${text}\n`);
      expect(text).toMatch(/Index (Only )?Scan/);
      expect(text).not.toMatch(/Seq Scan on messages/);
    } finally {
      try {
        await tx.$executeRaw`ROLLBACK`;
      } finally {
        await tx.$disconnect();
        await t.prisma.db.$executeRaw`ANALYZE messages`;
      }
    }
  });
  it('reads the newest100 actual replies independently of terminal thread retention using a covering index', async () => {
    const f = await fixture.room();
    const prefix = randomUUID();
    const at = new Date();
    // Owner-approved A16 exception: SQL transaction on a dedicated one-connection
    // test client avoids both Prisma's interactive timer and per-row FK cleanup.
    const tx = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    try {
      await tx.$executeRaw`BEGIN`;
      await tx.$executeRaw`
        INSERT INTO messages (id, room_id, sender_id, body, created_at, updated_at)
        SELECT ${prefix} || '-source-' || n::text, ${f.roomId}, ${f.user.id}, 'Original question', ${at}, ${at}
        FROM generate_series(1,10000) n`;
      await tx.$executeRaw`
        INSERT INTO messages (id, room_id, persona_id, is_simulated, reply_to_id, body, created_at, updated_at)
        SELECT ${prefix} || '-reply-' || n::text, ${f.roomId}, ${f.persona.id}, true,
          ${prefix} || '-source-' || n::text, repeat('History ',250),
          ${at}::timestamptz + n * interval '1 second', ${at}
        FROM generate_series(1,10000) n`;
      await tx.$executeRaw`ANALYZE messages`;
      const history = await scan.history(tx);
      expect(history).toHaveLength(100);
      expect(history[0]).toMatchObject({
        id: `${prefix}-reply-10000`,
        replyToId: `${prefix}-source-10000`,
        groupId: f.group.id,
        roomId: f.roomId,
        personaName: f.persona.name,
      });
      expect(history.at(-1)?.id).toBe(`${prefix}-reply-9901`);
      expect(await tx.botThread.count({ where: { groupIds: { has: f.group.id } } })).toBe(0);
      const plan = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${botReplyHistorySql()}`,
      );
      const text = plan.map((row) => row['QUERY PLAN']).join('\n');
      process.stdout.write(`${text}\n`);
      expect(text).toContain('messages_bot_reply_history_idx');
      expect(text).not.toMatch(/Seq Scan on messages/);
    } finally {
      try {
        await tx.$executeRaw`ROLLBACK`;
      } finally {
        await tx.$disconnect();
        await t.prisma.db.$executeRaw`ANALYZE messages`;
      }
    }
  });
});
