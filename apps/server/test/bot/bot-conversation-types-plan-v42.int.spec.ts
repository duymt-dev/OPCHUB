import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  conversationTypesPageSql,
  type ConversationTypeRow,
} from '@/modules/bot/bulk/bot-conversation-types.repository';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('D-112 conversation type keyset access path', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it('seeks one page and case-insensitive names over 10000 wide definitions without a table scan', async () => {
    const prefix = randomUUID();
    await t.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw`SAVEPOINT type_fixture`;
      await tx.$executeRaw`
        INSERT INTO bot_conversation_types (id, name, description, updated_at)
        SELECT 'f0000000-0000-7000-8000-' || lpad(n::text,12,'0'),
          ${prefix} || '-' || n::text, repeat('Long definition ',100), now()
        FROM generate_series(1,10000) n`;
      await tx.$executeRaw`ANALYZE bot_conversation_types`;
      const sql = conversationTypesPageSql({
        after: 'f0000000-0000-7000-8000-000000008000',
        limit: 50,
      });
      const rows = await tx.$queryRaw<ConversationTypeRow[]>(sql);
      expect(rows).toHaveLength(51);
      expect(rows[0]?.id).toBe('f0000000-0000-7000-8000-000000008001');
      expect(rows.at(-1)?.id).toBe('f0000000-0000-7000-8000-000000008051');
      const plan = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${sql}`,
      );
      const text = plan.map((row) => row['QUERY PLAN']).join('\n');
      process.stdout.write(`${text}\n`);
      expect(text).toMatch(/Index Only Scan using bot_conversation_types_pkey/);
      expect(text).not.toMatch(/Seq Scan on bot_conversation_types/);
      const name = `${prefix.toUpperCase()}-8001`;
      const equality = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>`
        EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM bot_conversation_types WHERE name = ${name}::citext`;
      const equalityText = equality.map((row) => row['QUERY PLAN']).join('\n');
      process.stdout.write(`${equalityText}\n`);
      expect(equalityText).toMatch(/Index Scan using bot_conversation_types_name_key/);
      expect(equalityText).not.toMatch(/Seq Scan/);
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT type_fixture`;
    });
  });
});
