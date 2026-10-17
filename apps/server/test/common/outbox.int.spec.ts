import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutboxRelayService, OutboxService } from '@/common/outbox';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('outbox (TIP-B03)', () => {
  let t: TestApp;
  let outbox: OutboxService;
  let relay: OutboxRelayService;

  beforeAll(async () => {
    t = await createTestApp();
    outbox = t.app.get(OutboxService);
    relay = t.app.get(OutboxRelayService);
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await t.prisma.db.$executeRaw`TRUNCATE outbox_events RESTART IDENTITY`;
  });

  it('rollback thì không còn sự kiện', async () => {
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        await outbox.add(tx, 'user.locked', { userId: 'u1', reason: null });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await t.prisma.db.outboxEvent.count()).toBe(0);
  });

  it('payload sai schema thì ném trong transaction', async () => {
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        // @ts-expect-error — cố ý thiếu userId để kiểm parse zod
        await outbox.add(tx, 'user.locked', { reason: null });
      }),
    ).rejects.toThrow();
    expect(await t.prisma.db.outboxEvent.count()).toBe(0);
  });

  it('relay gọi handler theo thứ tự id và đánh dấu đã gửi', async () => {
    const seen: string[] = [];
    relay.register('mail.requested', (p) => {
      seen.push(p.mailLogId);
      return Promise.resolve();
    });
    await t.prisma.db.$transaction(async (tx) => {
      for (const id of ['a', 'b', 'c']) await outbox.add(tx, 'mail.requested', { mailLogId: id });
    });
    expect(await relay.relayOnce()).toBe(3);
    expect(seen).toEqual(['a', 'b', 'c']);
    expect(await t.prisma.db.outboxEvent.count({ where: { dispatchedAt: null } })).toBe(0);
  });

  it('hai relay song song xử lý mỗi sự kiện đúng một lần (SKIP LOCKED)', async () => {
    const seen: string[] = [];
    relay.register('mail.requested', async (p) => {
      await new Promise((r) => setTimeout(r, 20));
      seen.push(p.mailLogId);
    });
    await t.prisma.db.$transaction(async (tx) => {
      for (let i = 0; i < 6; i++) await outbox.add(tx, 'mail.requested', { mailLogId: `m${i}` });
    });
    const [a, b] = await Promise.all([relay.relayOnce(), relay.relayOnce()]);
    expect(a + b).toBe(6);
    expect(new Set(seen).size).toBe(6);
    expect(seen).toHaveLength(6);
  });

  it('handler lỗi: tăng attempts, giữ chưa gửi, lần sau thử lại', async () => {
    let fail = true;
    relay.register('user.locked', () =>
      fail ? Promise.reject(new Error('redis down')) : Promise.resolve(),
    );
    await t.prisma.db.$transaction((tx) =>
      outbox.add(tx, 'user.locked', { userId: 'u', reason: null }),
    );
    expect(await relay.relayOnce()).toBe(0);
    const row = await t.prisma.db.outboxEvent.findFirstOrThrow();
    expect(row.attempts).toBe(1);
    expect(row.dispatchedAt).toBeNull();
    expect(row.lastError).toBe('redis down');
    fail = false;
    expect(await relay.relayOnce()).toBe(1);
  });
});
