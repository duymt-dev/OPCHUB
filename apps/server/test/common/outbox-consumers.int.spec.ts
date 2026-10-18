import type { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { outboxEvents, type OutboxEventType } from '@opchub/shared/outbox';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OutboxRelayService } from '@/common/outbox';
import { OutboxRelayProcessor } from '@/worker/processors/outbox-relay.processor';
import { WorkerAppModule } from '@/worker/worker-app.module';

/**
 * Loại sự kiện đã phát nhưng chưa có consumer — relay giữ pending chờ replay (TD-023).
 * TIP-V2-104 viết consumer rồi XOÁ các dòng này; test dưới buộc allowlist không được dư.
 */
const PENDING_CONSUMERS: OutboxEventType[] = [
  'user.locked',
  'user.session_revoked',
  'user.role_changed',
];

describe('outbox consumer (TIP-V2-101, M1)', () => {
  let ctx: INestApplicationContext;
  let registered: Set<OutboxEventType>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [WorkerAppModule] })
      .overrideProvider(OutboxRelayProcessor)
      .useValue({})
      .compile();
    ctx = await moduleRef.init();
    registered = new Set(ctx.get(OutboxRelayService).registeredTypes());
  });
  afterAll(async () => {
    await ctx.close();
  });

  it('M1 mọi sự kiện outbox trong events.ts có consumer ở worker', () => {
    const missing = (Object.keys(outboxEvents) as OutboxEventType[]).filter(
      (t) => !registered.has(t) && !PENDING_CONSUMERS.includes(t),
    );
    expect(missing).toEqual([]);
  });

  it('allowlist chỉ chứa loại có thật và còn thiếu consumer (có consumer thì phải xoá khỏi allowlist)', () => {
    for (const t of PENDING_CONSUMERS) {
      expect(t in outboxEvents).toBe(true);
      expect(registered.has(t)).toBe(false);
    }
  });
});
