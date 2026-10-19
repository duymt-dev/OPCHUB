import { FakeMailProvider } from '@opchub/integrations';
import { campaignSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ENV, type Env } from '@/common/config';
import { MAIL } from '@/common/integrations';
import { MailSenderService, MailService, UnsubscribeToken } from '@/modules/mail';
import { CampaignSenderService, MarketingCoreModule } from '@/modules/marketing';
import { addMember, createGroup, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const PREFIX = 'CD huỷ nhận';

/** BUG-036 (NĐ 13/2023): link + header huỷ nhận, suppression chỉ chặn thư chiến dịch */
describe('Marketing — huỷ nhận email chiến dịch (BUG-036)', () => {
  let t: TestApp;
  let editor: string;
  const fake = new FakeMailProvider();
  const emails: string[] = [];

  beforeAll(async () => {
    t = await createTestApp({ imports: [MarketingCoreModule], overrides: [[MAIL, fake]] });
  });
  beforeEach(async () => {
    await flushAuthState(t);
    editor = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    const ids = (
      await t.prisma.db.campaign.findMany({
        where: { name: { startsWith: PREFIX } },
        select: { id: true },
      })
    ).map((c) => c.id);
    await t.prisma.db.mailLog.deleteMany({
      where: { OR: [{ campaignId: { in: ids } }, { to: { in: emails } }] },
    });
    await t.prisma.db.campaign.deleteMany({ where: { id: { in: ids } } });
    await t.prisma.db.mailSuppression.deleteMany({ where: { email: { in: emails } } });
    await t.close();
  });

  /** Nhóm test 2 người; chiến dịch "theo nhóm" → gửi hết thư qua FakeMail */
  async function setup() {
    const g = await createGroup(t);
    const a = await createUser(t);
    const b = await createUser(t);
    emails.push(a.email, b.email);
    await addMember(t, g.id, a.id);
    await addMember(t, g.id, b.id);
    return { g, a, b };
  }

  async function sendCampaign(groupId: string, name: string) {
    const r = await t.call('/admin/campaigns', {
      method: 'POST',
      token: editor,
      json: {
        name: `${PREFIX} ${name}`,
        subject: 'Tin mới',
        body: '<p>Nội dung</p>',
        audience: 'groups',
        groupIds: [groupId],
        mode: 'send',
      },
    });
    const c = campaignSchema.parse(await r.json());
    await t.app.get(CampaignSenderService).runBatch(c.id);
    const logs = await t.prisma.db.mailLog.findMany({
      where: { campaignId: c.id },
      select: { id: true, to: true },
    });
    const sender = t.app.get(MailSenderService);
    for (const l of logs) await sender.send(l.id, false);
    return { c, logs };
  }

  it('BUG-036 link huỷ đăng ký trong thư chiến dịch + List-Unsubscribe', async () => {
    const { g, a } = await setup();
    await sendCampaign(g.id, 'link');
    const mail = fake.lastTo(a.email);
    const portal = t.app.get<Env>(ENV).PORTAL_URL;
    const token = t.app.get(UnsubscribeToken).sign(a.email);
    expect(mail?.html).toContain('Không muốn nhận email này?');
    expect(mail?.html).toContain(`href="${portal}/unsubscribe?token=${token}"`);
    expect(mail?.headers?.['List-Unsubscribe']).toBe(
      `<${portal}/v1/public/unsubscribe?token=${token}>`,
    );
    expect(mail?.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    await t.prisma.db.group.delete({ where: { id: g.id } });
  });

  it('BUG-036 huỷ nhận → không nhận chiến dịch sau, vẫn nhận OTP; ước tính giảm 1', async () => {
    const { g, a, b } = await setup();
    const est = async () =>
      (
        (await (
          await t.call(`/admin/campaigns/estimate?audience=all`, { token: editor })
        ).json()) as { recipients: number }
      ).recipients;
    const before = await est();
    const token = t.app.get(UnsubscribeToken).sign(a.email);
    const info = await t.call(`/public/unsubscribe?token=${token}`);
    expect(info.status).toBe(200);
    expect(await info.json()).toEqual({ email: `${a.email.slice(0, 2)}***@test.opchub.vn` });
    const r = await t.call('/public/unsubscribe', { method: 'POST', json: { token } });
    expect(r.status).toBe(200);
    expect(await est()).toBe(before - 1);

    const { logs } = await sendCampaign(g.id, 'sau huỷ');
    expect(logs.map((l) => l.to.toLowerCase())).toEqual([b.email.toLowerCase()]);

    // Thư giao dịch vẫn gửi
    const mail = t.app.get(MailService);
    for (const kind of ['otp', 'fee_reminder'] as const) {
      const id = await t.prisma.db.$transaction((tx) =>
        mail.request(tx, { to: a.email, kind, subject: `Thư ${kind}`, html: '<p>x</p>' }),
      );
      expect(await t.app.get(MailSenderService).send(id, false)).toEqual({ status: 'sent' });
    }
    expect(fake.lastTo(a.email)?.subject).toBe('Thư fee_reminder');
    expect(fake.lastTo(a.email)?.headers).toBeUndefined();
    await t.prisma.db.group.delete({ where: { id: g.id } });
  });

  it('BUG-036 thư chiến dịch đã xếp hàng trước khi huỷ nhận → không gửi (cancelled)', async () => {
    const u = await createUser(t);
    emails.push(u.email);
    const mail = t.app.get(MailService);
    const id = await t.prisma.db.$transaction((tx) =>
      mail.request(tx, { to: u.email, kind: 'campaign', subject: 'CD', html: '<p>x</p>' }),
    );
    await t.prisma.db.mailSuppression.create({ data: { email: u.email.toUpperCase() } });
    expect(await t.app.get(MailSenderService).send(id, false)).toEqual({ status: 'skipped' });
    const row = await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ status: 'cancelled', bodyHtml: null });
    expect(fake.lastTo(u.email)).toBeUndefined();
  });

  it('BUG-036 token giả / sửa 1 ký tự → 400', async () => {
    const u = await createUser(t);
    const token = t.app.get(UnsubscribeToken).sign(u.email);
    const last = token.at(-1) === '0' ? '1' : '0';
    const tampered = `${token.slice(0, -1)}${last}`;
    for (const bad of [
      tampered,
      'abc',
      `${Buffer.from('x@y.vn').toString('base64url')}.${'a'.repeat(64)}`,
    ]) {
      const g = await t.call(`/public/unsubscribe?token=${encodeURIComponent(bad)}`);
      expect(g.status).toBe(400);
      const p = await t.call('/public/unsubscribe', { method: 'POST', json: { token: bad } });
      expect(p.status).toBe(400);
      expect(((await p.json()) as { error: { message: string } }).error.message).toMatch(
        /Liên kết huỷ đăng ký không hợp lệ|Dữ liệu không hợp lệ/,
      );
    }
    expect(await t.prisma.db.mailSuppression.count({ where: { email: u.email } })).toBe(0);
  });

  it('BUG-036 POST 2 lần → 200 cả hai, 1 dòng suppression (idempotent); one-click qua query', async () => {
    const u = await createUser(t);
    emails.push(u.email);
    const token = t.app.get(UnsubscribeToken).sign(u.email);
    const one = await t.call('/public/unsubscribe', { method: 'POST', json: { token } });
    const two = await t.call('/public/unsubscribe', { method: 'POST', json: { token } });
    // RFC 8058: trình đọc thư POST form `List-Unsubscribe=One-Click` tới URL có `?token=`
    const click = await t.call(`/public/unsubscribe?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    });
    expect([one.status, two.status, click.status]).toEqual([200, 200, 200]);
    const rows = await t.prisma.db.mailSuppression.findMany({ where: { email: u.email } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reason).toBe('unsubscribe');
  });
});
