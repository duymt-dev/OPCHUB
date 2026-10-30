import { FakeMailProvider } from '@opchub/integrations';
import { directorConfigSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAIL } from '@/common/integrations';
import { OutboxRelayService } from '@/common/outbox';
import { RegionalDirectorService } from '@/modules/affiliate';
import { MailCoreModule, MailSenderService } from '@/modules/mail';
import { MailProcessor } from '@/worker/processors/mail.processor';
import { createUser, flushAuthState, loginOf, tokenBodySchema } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-616 BR-464 native director mail delivery', () => {
  let t: TestApp;
  let token: string;
  let original: { userId: string | null; appointedAt: Date | null; version: number };
  const ids: string[] = [];
  const fake = new FakeMailProvider();

  beforeAll(async () => {
    t = await createTestApp({
      imports: [MailCoreModule],
      providers: [MailProcessor],
      overrides: [[MAIL, fake]],
    });
    await flushAuthState(t);
    original = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
      select: { userId: true, appointedAt: true, version: true },
    });
    await t.prisma.db.regionalDirector.update({
      where: { region: 'north' },
      data: { userId: null, appointedAt: null },
    });
    const admin = await createUser(t, { systemRole: 'admin' });
    ids.push(admin.id);
    token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
  });
  afterAll(async () => {
    await t.prisma.db.regionalDirector.update({ where: { region: 'north' }, data: original });
    await t.prisma.db.user.deleteMany({ where: { id: { in: ids } } });
    await t.close();
  });

  async function north() {
    const response = await t.call('/admin/gdv', { token });
    expect(response.status).toBe(200);
    const slot = directorConfigSchema
      .parse(await response.json())
      .slots.find((s) => s.region === 'north');
    if (!slot) throw new Error('Missing permanent north slot');
    return slot;
  }

  async function deliver(to: string, kind: 'director_appointed' | 'director_revoked') {
    const row = await t.prisma.db.mailLog.findFirstOrThrow({
      where: { to, kind },
      select: { id: true, status: true, priority: true },
    });
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'mail.requested', payload: { path: ['mailLogId'], equals: row.id } },
      select: { id: true, dispatchedAt: true },
    });
    expect(row.status).toBe('queued');
    expect(event.dispatchedAt).toBeNull();
    expect(row.priority).toBe(3);
    const relay = t.app.get(OutboxRelayService);
    while ((await relay.relayOnce()) > 0);
    await expect
      .poll(
        async () =>
          (
            await t.prisma.db.mailLog.findUniqueOrThrow({
              where: { id: row.id },
              select: { status: true },
            })
          ).status,
      )
      .toBe('sent');
    expect(
      (await t.prisma.db.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).dispatchedAt,
    ).not.toBeNull();
    // Replay the actual persisted event through its registered queue consumer.
    await t.prisma.db.outboxEvent.update({
      where: { id: event.id },
      data: { dispatchedAt: null, lockedUntil: null },
    });
    while ((await relay.relayOnce()) > 0);
    await t.app.get(MailSenderService).send(row.id, false);
    const sent = fake.sent.filter(
      (mail) =>
        mail.to === to &&
        mail.subject ===
          (kind === 'director_appointed'
            ? 'Thông báo bổ nhiệm GĐ Vùng'
            : 'Thông báo thu hồi GĐ Vùng'),
    );
    expect(sent).toHaveLength(1);
    const mail = sent[0];
    if (!mail) throw new Error('Missing fake delivery');
    expect(mail.html).toContain('http://localhost:3000/login');
    expect(mail.html).not.toMatch(/mật khẩu|password|User@2026/i);
    expect(
      (await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id: row.id } })).bodyHtml,
    ).toBeNull();
    return mail.html;
  }

  it.each(['active', 'expired'] as const)(
    'EM-GDV1/2 transaction → relay → BullMQ → fake provider once; prior fee %s',
    async (fee) => {
      const user = await createUser(t, { fee });
      ids.push(user.id);
      const before = await t.prisma.db.membershipFee.findUniqueOrThrow({
        where: { userId: user.id },
      });
      const config = await north();
      const appointed = await t.call('/admin/gdv', {
        method: 'POST',
        token,
        json: { region: 'north', userId: user.id, version: config.version },
      });
      expect(appointed.status).toBe(200);
      const html = await deliver(user.email, 'director_appointed');
      expect(html).toContain('Miền Bắc');
      expect(html).toContain('Miễn phí thành viên trong thời gian đương nhiệm');
      for (const province of config.provinces) expect(html).toContain(province);
      expect(html).toContain('Hướng dẫn GĐ Vùng');
      const revoked = await t.call('/admin/gdv/north', {
        method: 'DELETE',
        token,
        json: { version: (await north()).version },
      });
      expect(revoked.status).toBe(200);
      const revokedHtml = await deliver(user.email, 'director_revoked');
      expect(revokedHtml).toContain('được thu hồi lúc');
      expect(revokedHtml).toContain('Phần chia sẻ đã ghi nhận trước khi thu hồi vẫn được chi trả');
      if (fee === 'active') {
        expect(revokedHtml).toContain('trước bổ nhiệm được giữ nguyên đến ngày');
        expect(revokedHtml).not.toContain('Vui lòng thanh toán');
      } else expect(revokedHtml).toContain('Vui lòng thanh toán để tiếp tục sử dụng');
      expect(
        (await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: user.id } }))
          .validUntil,
      ).toEqual(before.validUntil);
      expect(fake.sent.filter((mail) => mail.to === user.email)).toHaveLength(2);
    },
  );

  it('BR-464 rollback after fee update produces no mail/outbox/provider effect', async () => {
    const user = await createUser(t, { fee: 'trial' });
    ids.push(user.id);
    const before = await t.prisma.db.membershipFee.findUniqueOrThrow({
      where: { userId: user.id },
    });
    const config = await north();
    await expect(
      t.app.get(RegionalDirectorService).appoint(
        { id: 'missing-mail-actor', ip: null },
        {
          region: 'north',
          userId: user.id,
          version: config.version,
        },
      ),
    ).rejects.toThrow('Tài khoản quản trị không còn hoạt động');
    expect(
      await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: user.id } }),
    ).toEqual(before);
    expect((await north()).incumbent).toBeNull();
    expect(await t.prisma.db.mailLog.count({ where: { to: user.email } })).toBe(0);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: {
          type: 'membership_fee.changed',
          payload: { path: ['userId'], equals: user.id },
        },
      }),
    ).toBe(0);
    const relay = t.app.get(OutboxRelayService);
    while ((await relay.relayOnce()) > 0);
    expect(fake.sent.filter((mail) => mail.to === user.email)).toHaveLength(0);
  });
});
