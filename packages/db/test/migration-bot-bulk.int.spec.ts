import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const ids: string[] = [];
const data = () => {
  const id = randomUUID();
  ids.push(id);
  return {
    id,
    requestId: randomUUID(),
    actorId: 'bulk-migration-actor',
    topics: ['Thuế'],
    typeName: 'Hỏi đáp',
    typeDescription: '',
    perTopic: 2,
    turns: 4,
    delayMinutes: 5,
    groupIds: ['g'],
    total: 2,
  };
};
afterAll(async () => {
  await db.botBulkBatch.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});
const checkFailure = { meta: { driverAdapterError: { cause: { code: '23514' } } } };

describe('D-112 durable bulk batch/result migration', () => {
  it('persists running defaults and enforces per-actor request idempotency', async () => {
    const input = data();
    expect(await db.botBulkBatch.create({ data: input })).toMatchObject({
      cursor: 0,
      attempts: 0,
      status: 'running',
      error: null,
      claimId: null,
      leaseUntil: null,
    });
    await expect(
      db.botBulkBatch.create({ data: { ...input, id: data().id } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(
      await db.botBulkBatch.create({ data: { ...input, id: data().id, actorId: 'other-actor' } }),
    ).toMatchObject({ requestId: input.requestId });
  });
  it.each([
    { topics: [] },
    { groupIds: [] },
    { perTopic: 0 },
    { perTopic: 6 },
    { turns: 1 },
    { turns: 9 },
    { delayMinutes: 0 },
    { delayMinutes: 61 },
    { total: 3 },
    { cursor: -1 },
    { cursor: 3 },
    { cursor: 2 },
    { status: 'unknown' },
    { status: 'done' },
    { status: 'failed', nextAt: null },
    { claimId: 'claim-only' },
    { leaseUntil: new Date() },
    { attempts: 4 },
    { error: 'provider' },
    { nextAt: null },
  ])('rejects invalid inputs/progress %j', async (patch) => {
    await expect(db.botBulkBatch.create({ data: { ...data(), ...patch } })).rejects.toMatchObject(
      checkFailure,
    );
  });
  it('supports fenced running -> failed -> retry -> done transitions without impossible terminal leases', async () => {
    const batch = await db.botBulkBatch.create({ data: data() });
    expect(
      (
        await db.botBulkBatch.updateMany({
          where: { id: batch.id, status: 'running', cursor: 0 },
          data: { status: 'failed', error: 'provider', nextAt: null },
        })
      ).count,
    ).toBe(1);
    expect(
      (
        await db.botBulkBatch.updateMany({
          where: { id: batch.id, status: 'running' },
          data: { cursor: 1 },
        })
      ).count,
    ).toBe(0);
    await db.botBulkBatch.update({
      where: { id: batch.id },
      data: { status: 'running', error: null, nextAt: new Date() },
    });
    await expect(
      db.botBulkBatch.update({
        where: { id: batch.id },
        data: { status: 'done', cursor: 2, nextAt: null, claimId: 'stale', leaseUntil: new Date() },
      }),
    ).rejects.toMatchObject(checkFailure);
    expect(
      await db.botBulkBatch.update({
        where: { id: batch.id },
        data: { status: 'done', cursor: 2, nextAt: null },
      }),
    ).toMatchObject({ status: 'done', cursor: 2 });
  });
  it('validates line hashes, unique positions and cascading result cleanup', async () => {
    const batch = await db.botBulkBatch.create({ data: data() });
    const opening = { personaId: 'a', body: 'Một câu' };
    const lines = [opening, { personaId: 'b', body: 'Câu khác' }];
    const hashes = await db.$queryRaw<
      { hashes: string[] }[]
    >`SELECT bot_script_line_hashes(${JSON.stringify(lines)}::jsonb) AS hashes`;
    const item = {
      batchId: batch.id,
      ordinal: 0,
      topic: 'Thuế',
      lines,
      lineHashes: hashes[0]!.hashes,
    };
    const row = await db.botBulkItem.create({ data: item });
    expect(row).toMatchObject({ selected: true, savedScriptId: null });
    await expect(db.botBulkItem.create({ data: item })).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      db.botBulkItem.create({ data: { ...item, ordinal: 1, lineHashes: ['fabricated'] } }),
    ).rejects.toMatchObject(checkFailure);
    await expect(
      db.botBulkItem.create({ data: { ...item, ordinal: 1, lines: [opening, opening] } }),
    ).rejects.toMatchObject(checkFailure);
    await expect(db.botBulkItem.create({ data: { ...item, ordinal: 500 } })).rejects.toMatchObject(
      checkFailure,
    );
    await db.botBulkBatch.delete({ where: { id: batch.id } });
    expect(await db.botBulkItem.count({ where: { batchId: batch.id } })).toBe(0);
  });
});
