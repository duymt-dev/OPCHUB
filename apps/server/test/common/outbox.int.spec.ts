import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutboxRelayService, OutboxService } from '@/common/outbox';
import { createTestApp, type TestApp } from '../setup/test-app';

/** Giả lập hết backoff / lease: đưa `locked_until` về quá khứ */
const expireLeases = (t: TestApp) =>
  t.prisma.db.$executeRaw`UPDATE outbox_events SET locked_until = now() - interval '1 second'`;

describe('outbox (TIP-B03, TIP-V2-101)', () => {
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
    relay.unregister('mail.requested');
    relay.unregister('user.locked');
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
    await expireLeases(t);
    expect(await relay.relayOnce()).toBe(1);
  });

  it('nhiều consumer cùng loại: chạy tuần tự theo thứ tự đăng ký; một cái lỗi → cả sự kiện thử lại', async () => {
    const seen: string[] = [];
    let fail = true;
    relay.register('user.locked', () => {
      seen.push('a');
      return Promise.resolve();
    });
    relay.register('user.locked', () => {
      seen.push('b');
      return fail ? Promise.reject(new Error('b lỗi')) : Promise.resolve();
    });
    await t.prisma.db.$transaction((tx) =>
      outbox.add(tx, 'user.locked', { userId: 'u', reason: null }),
    );
    expect(await relay.relayOnce()).toBe(0);
    fail = false;
    await expireLeases(t);
    expect(await relay.relayOnce()).toBe(1);
    // Consumer phải idempotent: `a` chạy lại ở lần thử 2
    expect(seen).toEqual(['a', 'b', 'a', 'b']);
  });

  it('TD-023 sự kiện chưa có handler giữ pending, replay khi đăng ký', async () => {
    await t.prisma.db.$transaction((tx) =>
      outbox.add(tx, 'user.locked', { userId: 'u-replay', reason: 'audit' }),
    );
    for (let i = 0; i < 3; i++) expect(await relay.relayOnce()).toBe(0);
    const pending = await t.prisma.db.outboxEvent.findFirstOrThrow();
    expect(pending.dispatchedAt).toBeNull();
    expect(pending.attempts).toBe(0);
    expect(pending.lockedUntil).toBeNull();

    const seen: string[] = [];
    relay.register('user.locked', (p) => {
      seen.push(p.userId);
      return Promise.resolve();
    });
    expect(await relay.relayOnce()).toBe(1);
    expect(seen).toEqual(['u-replay']);
    expect(await t.prisma.db.outboxEvent.count({ where: { dispatchedAt: null } })).toBe(0);
  });

  it('TD-019 handler chạy ngoài transaction (không idle in transaction, dòng không bị khoá)', async () => {
    let probe: { idle: number; lockFree: boolean } | undefined;
    relay.register('mail.requested', async () => {
      await new Promise((r) => setTimeout(r, 300));
      const idle = await t.prisma.db.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM pg_stat_activity
        WHERE datname = current_database() AND state = 'idle in transaction'`;
      const lockFree = await t.prisma.db.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ id: bigint }[]>`
          SELECT id FROM outbox_events FOR UPDATE NOWAIT`;
        return rows.length === 1;
      });
      probe = { idle: Number(idle[0]?.n ?? 0), lockFree };
    });
    await t.prisma.db.$transaction((tx) => outbox.add(tx, 'mail.requested', { mailLogId: 'x' }));
    expect(await relay.relayOnce()).toBe(1);
    expect(probe).toEqual({ idle: 0, lockFree: true });
  });

  it('TD-019 handler lỗi: backoff, không gọi lại trước hạn, hết hạn thì gọi lại', async () => {
    let calls = 0;
    relay.register('user.locked', () => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('lần đầu lỗi')) : Promise.resolve();
    });
    await t.prisma.db.$transaction((tx) =>
      outbox.add(tx, 'user.locked', { userId: 'u', reason: null }),
    );
    expect(await relay.relayOnce()).toBe(0);
    const row = await t.prisma.db.outboxEvent.findFirstOrThrow();
    expect(row.attempts).toBe(1);
    expect(row.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    expect(await relay.relayOnce()).toBe(0);
    expect(calls).toBe(1);
    await expireLeases(t);
    expect(await relay.relayOnce()).toBe(1);
    expect(calls).toBe(2);
  });

  it('lease hết hạn → relay khác nhận lại', async () => {
    relay.register('mail.requested', () => Promise.resolve());
    await t.prisma.db.$transaction((tx) => outbox.add(tx, 'mail.requested', { mailLogId: 'l' }));
    // Relay A nhận lô rồi chết trước khi đánh dấu: chỉ còn lease
    await t.prisma.db
      .$executeRaw`UPDATE outbox_events SET locked_until = now() + interval '60 seconds'`;
    expect(await relay.relayOnce()).toBe(0);
    await expireLeases(t);
    expect(await relay.relayOnce()).toBe(1);
  });
});
