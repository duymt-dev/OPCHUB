import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { personaTurnPruneSql } from '@/modules/chat/repositories/persona-turn-prune';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser } from '../factories/user.factory';
import { withRolledBackMessages } from './persona-plan-fixture';

describe('A17 persona prune with a hot target room and fifty background rooms', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it('seeks partial/primary indexes without message Seq Scan or Hash Join and retains120', async () => {
    const prefix = randomUUID();
    const groupIds = Array.from({ length: 51 }, (_, n) => `${prefix}-g-${n}`);
    const roomIds = groupIds.map((id) => `${id}-general`);
    const target = roomIds[0] ?? '';
    const at = new Date('2026-11-07T00:00:00Z');
    const member = await createUser(t, { fee: 'active' });
    try {
      await t.prisma.db.group.createMany({
        data: groupIds.map((id) => ({
          id,
          slug: id,
          name: id,
          province: id,
          region: 'central' as const,
        })),
      });
      await t.prisma.db.room.createMany({
        data: roomIds.map((id, n) => ({
          id,
          groupId: groupIds[n] ?? '',
          slug: 'general',
          name: 'General',
          isDefault: true,
        })),
      });
      await t.prisma.db.persona.create({ data: { id: prefix, name: 'A17 fixture', groupIds } });
      await withRolledBackMessages(t, async (db) => {
        await db.$executeRaw`
        INSERT INTO messages (id,room_id,persona_id,is_simulated,body,created_at,updated_at)
        SELECT ${prefix} || '-bot-' || n, ${target}, ${prefix}, true, 'hot simulated',
          ${at}::timestamptz + n * interval '1 millisecond', ${at}
        FROM generate_series(1,10000) n`;
        await db.$executeRaw`
        INSERT INTO messages (id,room_id,persona_id,is_simulated,body,created_at,updated_at)
        SELECT ${prefix} || '-noise-' || n, ${prefix} || '-g-' || (1+(n-1)/300) || '-general',
          ${prefix}, true, 'background simulated', ${at}, ${at}
        FROM generate_series(1,15000) n`;
        await db.$executeRaw`
        INSERT INTO messages (id,room_id,sender_id,is_simulated,body,created_at,updated_at)
        SELECT ${prefix} || '-member-' || n, ${target}, ${member.id}, false, 'real member', ${at}, ${at}
        FROM generate_series(1,10000) n`;
        await db.$executeRaw`ANALYZE messages`;
        const plan = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`
        EXPLAIN (ANALYZE, BUFFERS) ${personaTurnPruneSql([target], at)}`);
        const text = plan.map((row) => row['QUERY PLAN']).join('\n');
        process.stdout.write(`A17 hot-room 35000-row EXPLAIN:\n${text}\n`);
        expect(text).toContain('messages_simulated_room_idx');
        expect(text).toContain('messages_pkey');
        expect(text).not.toMatch(/Seq Scan on messages/);
        expect(text).not.toContain('Hash Join');
        expect(
          await db.message.count({
            where: {
              roomId: target,
              isSimulated: true,
              deletedAt: null,
            },
          }),
        ).toBe(120);
        expect(
          await db.message.count({
            where: {
              roomId: target,
              isSimulated: false,
              deletedAt: null,
            },
          }),
        ).toBe(10000);
        expect(
          await db.message.count({
            where: {
              roomId: { in: roomIds.slice(1) },
              deletedAt: null,
            },
          }),
        ).toBe(15000);
      });
    } finally {
      await t.prisma.db.message.deleteMany({ where: { roomId: { in: roomIds } } });
      await t.prisma.db.group.deleteMany({ where: { id: { in: groupIds } } });
      await t.prisma.db.persona.deleteMany({ where: { id: prefix } });
      await t.prisma.db.user.deleteMany({ where: { id: member.id } });
      await t.prisma.db.$executeRaw`ANALYZE messages`;
    }
  });
});
