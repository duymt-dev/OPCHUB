import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { assertDemoDatabase } from '../seed/demo/guard';
import { seedDemo } from '../seed/demo/index';
import { testEnv } from './env';

if (assertDemoDatabase(testEnv.TEST_DATABASE_URL) !== 'opchub_test')
  throw new Error('Bot workflow fixture integration requires opchub_test');
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });

afterAll(async () => {
  await seedDemo(db);
  await db.$disconnect();
});

async function createWorkflowState() {
  await db.botConversationType.create({ data: { name: 'Demo workflow type' } });
  const batch = await db.botBulkBatch.create({
    data: {
      requestId: randomUUID(),
      actorId: 'admin',
      topics: ['Demo'],
      typeName: 'Demo workflow type',
      typeDescription: '',
      perTopic: 1,
      turns: 2,
      delayMinutes: 5,
      groupIds: ['c1'],
      total: 1,
      cursor: 1,
      status: 'done',
      nextAt: null,
    },
  });
  const lines = [
    { personaId: 'p1', body: 'Mở đầu' },
    { personaId: 'p1', body: 'Khép lại' },
  ];
  const hashes = await db.$queryRaw<{ hashes: string[] }[]>`
    SELECT bot_script_line_hashes(${JSON.stringify(lines)}::jsonb) AS hashes`;
  const lineHashes = hashes[0]?.hashes;
  if (!lineHashes) throw new Error('Missing line hashes');
  await db.botBulkItem.create({
    data: { batchId: batch.id, ordinal: 0, topic: 'Demo', lines, lineHashes, savedScriptId: 's1' },
  });
  await db.botReplyRun.create({
    data: {
      groupId: 'c1',
      roomId: 'c1-general',
      groupName: 'Demo',
      messageIds: ['previous-message'],
      status: 'running',
      nextAt: new Date(),
    },
  });
  await db.botRotationCursor.create({ data: { groupId: 'c1', lastScriptId: 'previous-script' } });
}

it('D-112 demo reset removes durable bulk/type/reply/rotation state and cascades saved markers', async () => {
  await seedDemo(db, { botManual: true });
  await createWorkflowState();
  expect(await db.botBulkItem.count()).toBe(1);
  await seedDemo(db, { botManual: true });
  expect(await db.botBulkBatch.count()).toBe(0);
  expect(await db.botBulkItem.count()).toBe(0);
  expect(await db.botConversationType.count()).toBe(0);
  expect(await db.botReplyRun.count()).toBe(0);
  expect(await db.botRotationCursor.count()).toBe(0);
  expect(await db.persona.count()).toBe(6);
  expect(await db.botScript.count()).toBe(3);
  // A repeated scenario can recreate the same type and active-run singleton safely.
  await createWorkflowState();
  expect(await db.botConversationType.count()).toBe(1);
  expect(await db.botReplyRun.count({ where: { status: 'running' } })).toBe(1);
});
