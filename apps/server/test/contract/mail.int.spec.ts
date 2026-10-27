import { FakeMailProvider } from '@opchub/integrations';
import {
  mailJobSchema,
  sendResultSchema,
  smtpSettingsSchema,
  welcomeMailPreviewSchema,
  welcomeMailSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAIL } from '@/common/integrations';
import { WelcomeService } from '@/modules/mail';
import { AppSettingsService } from '@/modules/settings';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

type SmtpRow = Awaited<ReturnType<TestApp['prisma']['db']['smtpConfig']['findUniqueOrThrow']>>;

/** Contract `mail` (8) — schema đúng như apps/admin/src/features/settings/api.ts + portal shell */
describe('Contract: mail', () => {
  let t: TestApp;
  let admin: string;
  let smtpBackup: SmtpRow;
  let welcomeBackup: unknown;
  const sentTo: string[] = [];
  beforeAll(async () => {
    t = await createTestApp({ overrides: [[MAIL, new FakeMailProvider()]] });
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    smtpBackup = await t.prisma.db.smtpConfig.findUniqueOrThrow({ where: { id: 1 } });
    welcomeBackup = (
      await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'welcome_mail' } })
    ).value;
  });
  afterAll(async () => {
    const b = smtpBackup;
    await t.prisma.db.smtpConfig.update({
      where: { id: 1 },
      data: {
        host: b.host,
        port: b.port,
        encryption: b.encryption,
        username: b.username,
        keyEnc: b.keyEnc ? Uint8Array.from(b.keyEnc) : null,
        fromName: b.fromName,
        fromEmail: b.fromEmail,
        replyTo: b.replyTo,
        dailyLimit: b.dailyLimit,
        enabled: b.enabled,
      },
    });
    await t.prisma.db.appSetting.update({
      where: { key: 'welcome_mail' },
      data: { value: welcomeBackup as never },
    });
    await t.app.get(AppSettingsService).invalidate('welcome_mail');
    await t.prisma.db.mailLog.deleteMany({ where: { to: { in: sentTo } } });
    await t.close();
  });

  const tag = () => `contract-${Date.now().toString(36)}-${sentTo.length}@test.opchub.vn`;

  it('mail chào mừng: GET → PUT → gửi thử', async () => {
    const cur = await ep(
      t,
      'GET',
      '/admin/mail/welcome',
      '/admin/mail/welcome',
      welcomeMailSchema,
      {
        token: admin,
      },
    );
    await ep(t, 'PUT', '/admin/mail/welcome', '/admin/mail/welcome', welcomeMailSchema, {
      token: admin,
      json: { ...cur.data, subject: 'Chào mừng (hợp đồng)' },
    });
    const to = tag();
    sentTo.push(to);
    await ep(
      t,
      'POST',
      '/admin/mail/welcome/test',
      '/admin/mail/welcome/test',
      mailJobSchema,
      { token: admin, json: { to } },
      202,
    );
  });

  it('SMTP: GET → PUT → verify → test', async () => {
    const cur = await ep(t, 'GET', '/admin/smtp', '/admin/smtp', smtpSettingsSchema, {
      token: admin,
    });
    const { host, port, encryption, fromName, fromEmail, replyTo, dailyLimit, enabled } = cur.data;
    const base = {
      ...{ host, port, encryption, fromName, fromEmail, replyTo, dailyLimit, enabled },
      username: 'contract@brevo',
    };
    const saved = await ep(t, 'PUT', '/admin/smtp', '/admin/smtp', smtpSettingsSchema, {
      token: admin,
      json: { ...base, key: 'xkeysib-contract-key' },
    });
    expect(saved.data.hasKey).toBe(true);
    await ep(t, 'POST', '/admin/smtp/verify', '/admin/smtp/verify', sendResultSchema, {
      token: admin,
      json: base,
    });
    const to = tag();
    sentTo.push(to);
    await ep(t, 'POST', '/admin/smtp/test', '/admin/smtp/test', sendResultSchema, {
      token: admin,
      json: { to },
    });
  });

  it('portal: popup mail chào mừng một lần (200) rồi 204', async () => {
    const u = await createUser(t, { fee: 'active' });
    const tk = await tokenOf(t, u);
    await t.app.get(WelcomeService).markUnseen(u.id, {
      email: u.email,
      fullName: 'Người thử',
      ownPassword: true,
    });
    const first = await ep(
      t,
      'GET',
      '/me/welcome-mail',
      '/me/welcome-mail',
      welcomeMailPreviewSchema.nullable(),
      { token: tk },
    );
    expect(first.data?.to).toBe(u.email);
    await ep(t, 'GET', '/me/welcome-mail', '/me/welcome-mail', null, { token: tk }, 204);
  });
});
