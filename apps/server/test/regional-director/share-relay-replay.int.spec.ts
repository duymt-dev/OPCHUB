import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OutboxRelayService } from '@/common/outbox';
import { RegionalDirectorCoreModule } from '@/modules/regional-director';
import { RegionalDirectorProcessor } from '@/worker/processors/regional-director.processor';
import { createTestApp, type TestApp } from '../setup/test-app';
import { confirmFee } from '../factories/affiliate.factory';
import { regionalShareFixture } from '../factories/regional-share.factory';

describe('A7 regional share real outbox delivery', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({
      imports: [RegionalDirectorCoreModule],
      providers: [RegionalDirectorProcessor],
    });
  });
  afterAll(() => t.close());

  it('A7 relay twice creates one share and one notification', async () => {
    const f = await regionalShareFixture(t);
    const payload = await confirmFee(t, f.customer.id, f.input.at);
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: {
        type: 'membership_fee.confirmed',
        payload: { path: ['periodId'], equals: payload.periodId },
      },
      select: { id: true },
    });
    const relay = t.app.get(OutboxRelayService);
    for (let i = 0; i < 30; i++) {
      await relay.relayOnce();
      if (
        await t.prisma.db.regionalShare.count({
          where: { source: 'membership', sourceId: payload.periodId },
        })
      )
        break;
    }
    const share = await t.prisma.db.regionalShare.findFirstOrThrow({
      where: { source: 'membership', sourceId: payload.periodId },
      select: { id: true, directorUserId: true },
    });
    const recorded = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'regional_share.recorded', payload: { path: ['shareId'], equals: share.id } },
      select: { id: true },
    });
    const notice = { id: `regional-share:${share.id}`, userId: f.director.id };
    for (let i = 0; i < 30; i++) {
      await relay.relayOnce();
      if (await t.prisma.db.notification.count({ where: notice })) break;
    }
    expect(share.directorUserId).toBe(f.director.id);
    expect(await t.prisma.db.notification.count({ where: notice })).toBe(1);
    await t.prisma.db.outboxEvent.updateMany({
      where: { id: { in: [event.id, recorded.id] } },
      data: { dispatchedAt: null, lockedUntil: null },
    });
    await relay.relayOnce();
    expect(
      await t.prisma.db.regionalShare.count({
        where: { source: 'membership', sourceId: payload.periodId },
      }),
    ).toBe(1);
    expect(await t.prisma.db.notification.count({ where: notice })).toBe(1);
    const delivered = await t.prisma.db.outboxEvent.findMany({
      where: { id: { in: [event.id, recorded.id] } },
      select: { dispatchedAt: true, attempts: true, lastError: true },
    });
    expect(delivered).toHaveLength(2);
    expect(
      delivered.every((r) => r.dispatchedAt !== null && r.attempts === 0 && r.lastError === null),
    ).toBe(true);
  });
});
