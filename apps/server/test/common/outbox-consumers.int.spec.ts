import type { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { outboxEvents, type OutboxEventType } from '@opchub/shared/outbox';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OutboxRelayService } from '@/common/outbox';
import { OutboxRelayProcessor } from '@/worker/processors/outbox-relay.processor';
import { WorkerAppModule } from '@/worker/worker-app.module';

/** M1: mọi loại sự kiện outbox phải có consumer ở worker (TIP-V2-104 đã xoá allowlist) */
describe('outbox consumer (TIP-V2-101, TIP-V2-104, M1)', () => {
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
      (t) => !registered.has(t),
    );
    expect(missing).toEqual([]);
  });

  it('M1 BUG-004 BUG-005 user.locked / unlocked / session_revoked có consumer', () => {
    for (const t of ['user.locked', 'user.unlocked', 'user.session_revoked'] as const) {
      expect(registered.has(t)).toBe(true);
    }
  });
});
