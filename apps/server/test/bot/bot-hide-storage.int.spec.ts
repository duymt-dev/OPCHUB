import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { ENV, type Env } from '@/common/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hidePersonaSql } from '@/modules/chat/repositories/persona-hide.repository';
import { createTestApp, type TestApp } from '../setup/test-app';
import { HideFixture } from './hide-fixture';

describe('REQ-141 actual bulk-hide SQL plan on native PostgreSQL', () => {
  let t: TestApp;
  let fixture: HideFixture;
  beforeAll(async () => {
    t = await createTestApp();
    const url = new URL(t.app.get<Env>(ENV).DATABASE_URL);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.port !== '5432' ||
      !['/opchub_test', '/opchub_v46_801_test'].includes(url.pathname)
    )
      throw new Error('Native test-only benchmark guard');
    fixture = new HideFixture(t);
    await fixture.start();
  });
  afterAll(async () => {
    await fixture?.close();
    await t?.close();
  });

  it('REQ-141 one-update scoped/global hide uses the partial persona index on >10000 wide messages; fixture rolls back', async () => {
    const f = await fixture.room();
    const prefix = `hide-plan-${randomUUID()}-`;
    await expect(
      t.prisma.db.$transaction(
        async (tx) => {
          await tx.$executeRaw`
        INSERT INTO messages(id,room_id,sender_id,body,created_at,updated_at)
        SELECT ${prefix} || n::text, ${f.roomId}, ${f.user.id}, repeat('wide human ',300), now(),now()
        FROM generate_series(1,10001) n`;
          await tx.$executeRaw`
        INSERT INTO messages(id,room_id,persona_id,is_simulated,body,hidden_at,created_at,updated_at)
        SELECT ${prefix} || 'hidden-' || n::text, ${f.roomId}, ${f.persona.id}, true,
          repeat('wide hidden bot ',200), now(),now(),now()
        FROM generate_series(1,10001) n`;
          await tx.$executeRaw`
        INSERT INTO messages(id,room_id,persona_id,is_simulated,body,created_at,updated_at)
        SELECT ${prefix} || 'bot-' || n::text, ${f.roomId}, ${f.persona.id}, true, repeat('wide bot ',300), now(),now()
        FROM generate_series(1,40) n`;
          await tx.$executeRaw`ANALYZE messages`;
          const scoped = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
            Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${hidePersonaSql(new Date(), [f.group.id])}`,
          );
          expect(
            await tx.message.count({
              where: {
                id: { startsWith: `${prefix}bot-` },
                hiddenAt: { not: null },
              },
            }),
          ).toBe(40);
          await tx.message.updateMany({
            where: { id: { startsWith: `${prefix}bot-` } },
            data: { hiddenAt: null },
          });
          const global = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
            Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${hidePersonaSql(new Date())}`,
          );
          expect(
            await tx.message.count({
              where: {
                id: { startsWith: `${prefix}bot-` },
                hiddenAt: { not: null },
              },
            }),
          ).toBe(40);
          expect(
            await tx.message.count({
              where: { roomId: f.roomId, senderId: f.user.id, hiddenAt: null },
            }),
          ).toBe(10001);
          expect(
            await tx.message.count({
              where: { id: { startsWith: `${prefix}hidden-` }, hiddenAt: { not: null } },
            }),
          ).toBe(10001);
          const plans = [scoped, global].map((rows) => rows.map((r) => r['QUERY PLAN']).join('\n'));
          process.stdout.write(
            `REQ-141 actual bulk hide scoped/global EXPLAIN:\n${plans.join('\n')}\n`,
          );
          for (const plan of plans) {
            expect(plan).toContain('messages_persona_visibility_seek_idx');
            expect(plan).toContain('Index Cond: ((is_simulated = true) AND (hidden_at IS NULL))');
            expect(plan).not.toContain('Seq Scan on messages');
            expect(plan.match(/Update on messages/g)).toHaveLength(1);
          }
          throw new Error('Rollback hide plan fixture');
        },
        { timeout: 30000 },
      ),
    ).rejects.toThrow('Rollback hide plan fixture');
    expect(await t.prisma.db.message.count({ where: { id: { startsWith: prefix } } })).toBe(0);
  });
});
