import { dashboardLiveSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PresenceService } from '@/common/realtime/presence.service';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('Dashboard Portal (B34)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    await t.redis.client.del('dashboard:live');
  });
  afterAll(async () => {
    await t.redis.client.del('dashboard:live');
    await t.close();
  });

  it('số thật (nhóm, thành viên, online Redis) + phần mô phỏng; cache 10s', async () => {
    const u = await createUser(t, { fee: 'active' });
    const tk = await tokenOf(t, u);
    await t.app.get(PresenceService).usersSeen([u.id]);
    const live = dashboardLiveSchema.parse(
      await (await t.call('/dashboard/live', { token: tk })).json(),
    );
    const groups = await t.prisma.db.group.count({ where: { deletedAt: null } });
    expect(live.communityCount).toBe(groups);
    expect(live.stats.online).toBeGreaterThanOrEqual(1);
    expect(live.stats.totalMembers).toBeGreaterThan(0);
    expect(live.members).toHaveLength(26);

    // Trong 10s trả lại bản cache (generatedAt không đổi)
    const again = dashboardLiveSchema.parse(
      await (await t.call('/dashboard/live', { token: tk })).json(),
    );
    expect(again.generatedAt).toBe(live.generatedAt);
    expect(await t.redis.client.ttl('dashboard:live')).toBeGreaterThan(0);
  });

  it('chưa đóng phí → 402', async () => {
    const tk = await tokenOf(t, await createUser(t, { fee: null }));
    expect((await t.call('/dashboard/live', { token: tk })).status).toBe(402);
  });
});
