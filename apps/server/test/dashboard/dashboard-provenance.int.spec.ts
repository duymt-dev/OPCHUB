import { dashboardLiveSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DashboardContentCacheService } from '@/modules/dashboard/dashboard-content-cache.service';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { expectPersistedMembers } from './dashboard-source.fixture';

describe('REQ-224 BUG-012 TD-010 Dashboard source provenance', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it('TIP-V2-512 real persisted prototype-like labels are allowed; DB rename replaces them', async () => {
    await flushAuthState(t);
    const u = await createUser(t, { fee: 'active' });
    const cache = t.app.get(DashboardContentCacheService);
    try {
      await t.prisma.db.user.update({
        where: { id: u.id },
        data: { fullName: 'Somchai Prasert', accountType: 'business' },
      });
      await t.prisma.db.businessProfile.create({
        data: {
          userId: u.id,
          taxCode: '',
          companyName: 'Siam AI Labs',
          representative: 'Somchai Prasert',
          position: 'Founder',
          mainField: 'AI',
          subFields: [],
        },
      });
      const tk = await tokenOf(t, u);
      const live = async () => {
        const response = await t.call('/dashboard/live', { token: tk });
        expect(response.status).toBe(200);
        return dashboardLiveSchema.parse(await response.json());
      };
      await cache.invalidate();
      const before = await live();
      expect(before.members.find((m) => m.id === u.id)).toMatchObject({
        id: u.id,
        name: 'Somchai Prasert',
        org: 'Siam AI Labs',
      });
      await expectPersistedMembers(t, before.members);

      await t.prisma.db.$transaction([
        t.prisma.db.user.update({ where: { id: u.id }, data: { fullName: 'Persisted rename' } }),
        t.prisma.db.businessProfile.update({
          where: { userId: u.id },
          data: { companyName: 'Persisted company rename' },
        }),
      ]);
      await cache.invalidate();
      const after = await live();
      expect(after.members.find((m) => m.id === u.id)).toMatchObject({
        id: u.id,
        name: 'Persisted rename',
        org: 'Persisted company rename',
      });
      await expectPersistedMembers(t, after.members);
    } finally {
      await t.prisma.db.user.update({ where: { id: u.id }, data: { deletedAt: new Date() } });
      await cache.invalidate();
      await t.redis.client.del('dashboard:totals', 'dashboard:feed');
    }
  });
});
