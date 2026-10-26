import { onboardingMailSchema, onboardingSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

/**
 * Contract Hướng dẫn bắt đầu (V4-611, 5) — schema đúng như apps/portal/src/features/onboarding/api.ts và
 * apps/admin/src/features/members/api.ts (Nhắc), marketing (mẫu email nhắc).
 */
describe('Contract: onboarding', () => {
  let t: TestApp;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    await t.prisma.db.appSetting.deleteMany({ where: { key: 'onboarding_mail' } });
    await t.close();
  });

  it('Portal: tiến độ + cờ; Admin: nhắc + mẫu email', async () => {
    const m = await createUser(t, { accountType: 'personal', fee: 'active' });
    const token = await tokenOf(t, m);
    await ep(t, 'GET', '/me/onboarding', '/me/onboarding', onboardingSchema, { token });
    await ep(
      t,
      'POST',
      '/me/onboarding/flags/:key',
      '/me/onboarding/flags/explore',
      null,
      { token },
      204,
    );
    await ep(
      t,
      'POST',
      '/admin/users/:id/onboarding-remind',
      `/admin/users/${m.id}/onboarding-remind`,
      null,
      { token: admin },
      204,
    );
    const tpl = await ep(
      t,
      'GET',
      '/admin/mail/onboarding',
      '/admin/mail/onboarding',
      onboardingMailSchema,
      {
        token: admin,
      },
    );
    await ep(t, 'PUT', '/admin/mail/onboarding', '/admin/mail/onboarding', onboardingMailSchema, {
      token: admin,
      json: tpl.data,
    });
  });
});
