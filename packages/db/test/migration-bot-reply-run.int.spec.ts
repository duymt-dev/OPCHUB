import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const ids: string[] = [];
const input = () => {
  const id = randomUUID();
  ids.push(id);
  return {
    id,
    groupId: 'migration-group',
    roomId: 'migration-room',
    groupName: 'Migration',
    messageIds: ['m1', 'm2'],
    status: 'stopped',
  };
};
afterAll(async () => {
  await db.botReplyRun.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});

describe('D-112 durable reply-run migration', () => {
  it('persists bounded defaults without creating chat content', async () => {
    const row = await db.botReplyRun.create({ data: input() });
    expect(row).toMatchObject({
      cursor: 0,
      posted: 0,
      manual: false,
      delaySeconds: 5,
      activeThreadId: null,
      nextAt: null,
    });
  });
  it.each([
    { messageIds: [] },
    { messageIds: Array.from({ length: 201 }, (_, i) => `m${i}`) },
    { cursor: 3 },
    { cursor: -1 },
    { posted: 1 },
    { delaySeconds: 0 },
    { delaySeconds: 601 },
    { status: 'unknown' },
    { status: 'done' },
    { nextAt: new Date() },
    { activeThreadId: 'stale' },
  ])('rejects invalid durable state %j', async (patch) => {
    await expect(db.botReplyRun.create({ data: { ...input(), ...patch } })).rejects.toThrow();
  });
  it('allows one active run across groups and releases the slot on conditional stop', async () => {
    const first = await db.botReplyRun.create({
      data: { ...input(), status: 'running', nextAt: new Date() },
    });
    await expect(
      db.botReplyRun.create({ data: { ...input(), status: 'running', groupId: 'another-group' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(
      (
        await db.botReplyRun.updateMany({
          where: { id: first.id, status: 'running' },
          data: { status: 'stopped', nextAt: null },
        })
      ).count,
    ).toBe(1);
    const next = await db.botReplyRun.create({ data: { ...input(), status: 'running' } });
    expect(next.status).toBe('running');
    await db.botReplyRun.update({
      where: { id: next.id },
      data: { status: 'done', cursor: 2, posted: 1 },
    });
  });
});
