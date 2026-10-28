import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  botRotationCandidatesSql,
  type RotationCandidate,
} from '@/modules/bot/rotation/bot-rotation.repository';
import { createTestApp, type TestApp } from '../setup/test-app';
import { rotationFixtures } from './rotation-fixture';

describe('D-112 rotation ID-first access path', () => {
  let t: TestApp;
  let fixture: ReturnType<typeof rotationFixtures>;
  beforeAll(async () => {
    t = await createTestApp();
    fixture = rotationFixtures(t);
    await fixture.start();
  });
  afterAll(async () => {
    await fixture.close();
    await t.close();
  });

  it('seeks eligible script IDs over 10000 wide scripts without scanning their JSON payloads', async () => {
    const { group, persona } = await fixture.group();
    const prefix = randomUUID();
    const now = new Date('2026-10-29T05:00:00Z');
    await t.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw`SAVEPOINT rotation_fixture`;
      await tx.$executeRaw`
        INSERT INTO bot_scripts (id, topic, group_ids, lines, run_at, created_at, updated_at)
        SELECT ${prefix} || '-' || lpad(n::text,5,'0'), repeat('Wide topic ',20), ARRAY[${group.id}]::text[],
          jsonb_build_array(jsonb_build_object('personaId', ${persona.id}::text, 'body', repeat('Wide script body ',200))),
          CASE WHEN n = 1 THEN ${now}::timestamptz + interval '1 day' ELSE NULL END, ${now}, ${now}
        FROM generate_series(1,10000) n`;
      await tx.$executeRaw`ANALYZE bot_scripts`;
      const candidates = await tx.$queryRaw<RotationCandidate[]>(botRotationCandidatesSql(now));
      expect(candidates.find((row) => row.groupId === group.id)?.scriptId).toBe(`${prefix}-00002`);
      expect(candidates.length).toBeLessThanOrEqual(30);
      const plan = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`
        EXPLAIN (ANALYZE, BUFFERS) ${botRotationCandidatesSql(now)}`);
      const text = plan.map((row) => row['QUERY PLAN']).join('\n');
      process.stdout.write(`${text}\n`);
      expect(text).toMatch(/bot_scripts_rotation_(groups|cursor)_idx/);
      expect(text).not.toMatch(/Seq Scan on bot_scripts/);
      await tx.$executeRaw`ROLLBACK TO SAVEPOINT rotation_fixture`;
    });
  });
});
