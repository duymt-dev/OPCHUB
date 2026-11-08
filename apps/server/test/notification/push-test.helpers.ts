import { createECDH } from 'node:crypto';
import { FakePushProvider } from '@opchub/integrations';
import {
  appNotifySettingsSchema,
  DEFAULT_APP_NOTIFY,
  type AppNotifySettings,
} from '@opchub/shared/api-domains';
import { ENV, loadEnv } from '@/common/config';
import { PUSH } from '@/common/integrations/integrations.module';
import { AppSettingsService } from '@/modules/settings';
import { createTestApp, type TestApp } from '../setup/test-app';

export async function pushTestApp() {
  const ec = createECDH('prime256v1');
  ec.generateKeys();
  const provider = new FakePushProvider();
  const t = await createTestApp({
    overrides: [
      [PUSH, provider],
      [
        ENV,
        {
          ...loadEnv(),
          PUSH_PROVIDER: 'fake',
          VAPID_PUBLIC_KEY: ec.getPublicKey().toString('base64url'),
        },
      ],
    ],
  });
  const previous = appNotifySettingsSchema.parse(
    (
      await t.prisma.db.appSetting.findUniqueOrThrow({
        where: { key: 'app' },
        select: { value: true },
      })
    ).value,
  );
  await setPushSettings(t, DEFAULT_APP_NOTIFY);
  return { t, provider, previous };
}
export async function setPushSettings(t: TestApp, value: AppNotifySettings) {
  await t.prisma.db.appSetting.update({ where: { key: 'app' }, data: { value } });
  await t.app.get(AppSettingsService).invalidate('app');
}
export const device = (suffix: string) => ({
  endpoint: `https://push.invalid/${suffix}`,
  keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
});

/** Remove only this suite's notifications/intents; never truncate shared outbox. */
export async function clearPushFixtures(t: TestApp, users: string[]) {
  if (!users.length) return;
  const notes = await t.prisma.db.notification.findMany({
    where: { userId: { in: users } },
    select: { id: true },
  });
  const ids = notes.map((n) => n.id);
  await t.prisma.db.$executeRaw`DELETE FROM outbox_events WHERE type='push.requested'
    AND (payload->'notificationIds') ?| ${ids}::text[]`;
  await t.prisma.db.pushDispatch.deleteMany({ where: { notificationId: { in: ids } } });
  await t.prisma.db.notification.deleteMany({ where: { userId: { in: users } } });
  await t.prisma.db.pushSubscription.deleteMany({ where: { userId: { in: users } } });
  await t.prisma.db.pushPreference.deleteMany({ where: { userId: { in: users } } });
}
