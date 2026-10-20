import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lockBotExecution } from '@/modules/bot/repositories/execution-lock';
import { BotRetentionService } from '@/modules/bot/services/bot-retention.service';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-208 terminal-only 30 conversation admission cap', () => {
  let t: TestApp;
  const at = new Date('2026-10-21T05:00:00Z');
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  async function scenario(active: number, done: number, requested: number) {
    const before = await t.prisma.db.botThread.count();
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        await lockBotExecution(tx);
        // A transaction-local fixture; intentional rollback restores all history and drafts.
        await tx.botThread.deleteMany();
        const rows = Array.from({ length: active + done }, (_, i) => ({
          id: randomUUID(),
          topic: `Retention ${i}`,
          groupIds: [],
          lines: [],
          status: i < active ? ('scheduled' as const) : ('done' as const),
          createdAt: new Date(at.getTime() + i),
        }));
        await tx.botThread.createMany({ data: rows });
        const allowed = await t.app.get(BotRetentionService).reserve(tx, requested);
        expect(allowed).toBe(Math.min(requested, 30 - active));
        expect(await tx.botThread.count({ where: { status: 'scheduled' } })).toBe(active);
        const removed = Math.max(0, active + done + allowed - 30);
        expect(await tx.botThread.count()).toBe(active + done - removed);
        const oldest = rows[active];
        if (removed && oldest)
          expect(await tx.botThread.findUnique({ where: { id: oldest.id } })).toBeNull();
        const data = Array.from({ length: allowed }, () => ({
          topic: 'New scheduled',
          groupIds: [],
          lines: [],
        }));
        if (data.length) await tx.botThread.createMany({ data });
        expect(await tx.botThread.count()).toBeLessThanOrEqual(30);
        throw new Error('Rollback retention fixture');
      }),
    ).rejects.toThrow('Rollback retention fixture');
    expect(await t.prisma.db.botThread.count()).toBe(before);
  }

  it('REQ-208 evicts the oldest done thread, never an active thread, before admitting number 31', () =>
    scenario(20, 10, 1));
  it('REQ-208 refuses a 31st active conversation without deleting active data', () =>
    scenario(30, 0, 1));
  it('REQ-208 a batch cannot consume more capacity than terminal eviction permits', () =>
    scenario(25, 5, 10));
});
