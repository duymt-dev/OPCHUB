import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { myRegionSchema } from '@opchub/shared/api-domains';
import { OutboxRelayService } from '@/common/outbox';
import { RegionalDirectorProcessor } from '@/worker/processors/regional-director.processor';
import {
  RegionalDirectorCoreModule,
  RegionalShareEventsHandler,
} from '@/modules/regional-director';
import { MyRegionService } from '@/modules/regional-director/services/my-region.service';
import { regionalShareFixture } from '../factories/regional-share.factory';
import { createUser, loginOf, tokenBodySchema } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('TIP-V46-804 own regional dashboard', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({
      imports: [RegionalDirectorCoreModule],
      providers: [RegionalDirectorProcessor],
    });
  });
  afterAll(() => t.close());
  beforeEach(async () => {
    await t.prisma.db.regionalDirector.updateMany({ data: { userId: null, appointedAt: null } });
    await t.prisma.db.affiliatePolicy.update({
      where: { id: 1 },
      data: { regionalFirstYear: 50, regionalStep: 10, regionalMin: 20 },
    });
    await t.prisma.db.outboxEvent.updateMany({
      where: { dispatchedAt: null },
      data: { dispatchedAt: new Date() },
    });
  });

  it('401; non-directors and revoked directors receive none even with old pending shares', async () => {
    expect((await t.call('/me/gdv')).status).toBe(401);
    const f = await regionalShareFixture(t);
    await f.ledger.record(f.input);
    const token = tokenBodySchema.parse(await (await loginOf(t, f.director)).json()).accessToken;
    const res = await t.call('/me/gdv', { token });
    expect(res.status).toBe(200);
    expect(myRegionSchema.parse(await res.json()).state).toBe('director');
    await t.prisma.db.regionalDirector.update({
      where: { region: f.region },
      data: { userId: null },
    });
    expect(await t.app.get(MyRegionService).read(f.director.id)).toEqual({ state: 'none' });
    expect(await t.app.get(MyRegionService).read(f.agent.id)).toEqual({ state: 'none' });
  });

  it('snapshot sums, 4 year buckets, distinct customers, unticked provinces and rotation scoping', async () => {
    const f = await regionalShareFixture(t);
    await t.prisma.db.regionalDirectorProvince.deleteMany({ where: { region: f.region } });
    await f.ledger.record(f.input);
    await f.ledger.record({ ...f.input, sourceId: randomUUID(), at: new Date('2027-10-02') });
    await f.ledger.record({ ...f.input, sourceId: randomUUID(), at: new Date('2030-10-02') });
    await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: { regionalFirstYear: 60 } });
    const data = await t.app.get(MyRegionService).read(f.director.id);
    if (data.state !== 'director') throw new Error('Missing director');
    expect(data.provinces).toEqual([]);
    expect(data.kpi).toMatchObject({
      count: 3,
      revenue: 3_600_000,
      share: 1_320_000,
      paid: 0,
      due: 1_320_000,
    });
    expect(data.years.map((r) => r.count)).toEqual([1, 1, 0, 1]);
    expect(data.years[0]).toMatchObject({ percent: 60, share: 600_000 });
    expect(data.affiliates[0]?.customers).toBe(1);
    expect(data.bank?.bankNo).toBe('123456789012');
    const next = await createUser(t, { fee: 'trial' });
    await t.prisma.db.regionalDirector.update({
      where: { region: f.region },
      data: { userId: next.id },
    });
    const empty = await t.app.get(MyRegionService).read(next.id);
    expect(empty).toMatchObject({
      state: 'director',
      kpi: { count: 0, share: 0 },
      months: [],
    });
    await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: { regionalFirstYear: 50 } });
  });

  it('real relay consumes recorded event and retry retains a single snapshot-recipient notification', async () => {
    const f = await regionalShareFixture(t, 'central');
    const id = await f.ledger.record(f.input);
    const relay = t.app.get(OutboxRelayService);
    await relay.relayOnce();
    await relay.relayOnce();
    const notificationId = `regional-share:${id}`;
    const notification = await t.prisma.db.notification.findUnique({
      where: { id: notificationId },
    });
    expect(notification).toMatchObject({ userId: f.director.id, link: '/affiliate?tab=reg' });
    expect(notification?.body).toContain(
      (
        await t.prisma.db.user.findUniqueOrThrow({
          where: { id: f.customer.id },
          select: { fullName: true },
        })
      ).fullName,
    );
    await t.app.get(RegionalShareEventsHandler).recorded({ shareId: id ?? '' });
    expect(await t.prisma.db.notification.count({ where: { id: notificationId } })).toBe(1);
    await t.app.get(RegionalShareEventsHandler).recorded({ shareId: 'missing' });
  });
});
