import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fundAmountOf, transferContentOf } from '@opchub/shared';
import { ENV, type Env } from '@/common/config';
import { bankTransferOf } from '@/common/integrations';
import { vietQrImage } from '@/common/integrations/vietqr-image';
import { FundraisingSchedulerService } from '@/modules/project';
import { PriceConfigService } from '@/modules/pricing';
import { MailQrToken, MailService } from '@/modules/mail';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('TIP-V46-821 BR-GV-04 expired-package mail creates a payable renewal, not a second paid code', () => {
  let t: TestApp;
  const projects: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    if (t) {
      await t.prisma.db.project.deleteMany({ where: { id: { in: projects } } });
      await t.close();
    }
  });
  async function fixture(days: number) {
    const u = await createUser(t, { fee: 'active' });
    const project = await t.prisma.db.project.create({
      data: {
        id: randomUUID(),
        ownerId: u.id,
        name: 'TIP821 renewal fixture',
        status: 'published',
        province: 'Hà Nội',
      },
    });
    projects.push(project.id);
    const endsAt = new Date(Date.now() + days * 86_400_000);
    const codes = await t.prisma.db.$queryRaw<
      { code: string }[]
    >`SELECT 'GV'||lpad(nextval('fundraising_code_seq')::text,6,'0') AS code`;
    const f = await t.prisma.db.projectFundraising.create({
      data: {
        projectId: project.id,
        ownerId: u.id,
        status: 'active',
        code: codes[0]?.code ?? 'GV000000',
        amount: 500_000,
        startsAt: new Date(Date.now() - 170 * 86_400_000),
        endsAt,
      },
    });
    return { u, project, f, endsAt };
  }
  it('SPEC13 T-14 shows current renewal price/date but no QR or pending request before expiry', async () => {
    const f = await fixture(13);
    await t.app.get(FundraisingSchedulerService).run();
    const m = await t.prisma.db.mailLog.findFirstOrThrow({
      where: { to: f.u.email, kind: 'fundraising' },
    });
    const amount = fundAmountOf(await t.app.get(PriceConfigService).current(), true);
    expect(m.bodyHtml).toContain(amount.toLocaleString('vi-VN'));
    expect(m.bodyHtml).toContain('Bạn có thể gia hạn sau khi gói hết hạn');
    expect(m.bodyHtml).not.toContain('/public/mail-qr/');
    expect(
      await t.prisma.db.projectFundraising.count({
        where: { projectId: f.project.id, status: 'pending_payment' },
      }),
    ).toBe(0);
  });
  it('SPEC13 expiry sends exactly one payable new-code QR and in-app intent, rerun is idempotent', async () => {
    const f = await fixture(-1),
      job = t.app.get(FundraisingSchedulerService);
    await job.run();
    await job.run();
    const mails = await t.prisma.db.mailLog.findMany({
      where: { to: f.u.email, kind: 'fundraising_expired' },
    });
    expect(mails).toHaveLength(1);
    const pending = await t.prisma.db.projectFundraising.findFirstOrThrow({
      where: { projectId: f.project.id, status: 'pending_payment' },
    });
    expect(pending.code).not.toBe(f.f.code);
    expect(pending.amount).toBe(fundAmountOf(await t.app.get(PriceConfigService).current(), true));
    expect(mails[0]?.bodyHtml).toContain(`GV`);
    expect(mails[0]?.bodyHtml).toContain(pending.code ?? '');
    expect(mails[0]?.bodyHtml).not.toContain(f.f.code ?? 'old-code');
    expect(mails[0]?.bodyHtml).toContain('Nội dung: OPCHUB');
    expect(mails[0]?.bodyHtml).toContain('Mã VietQR chuyển khoản');
    const url = mails[0]?.bodyHtml?.match(/src="([^"]+\/public\/mail-qr\/[^"]+\.png)"/)?.[1];
    if (!url) throw new Error('Missing QR');
    const image = await t.call(new URL(url).pathname.replace(/^\/v1/, ''));
    expect(image.status).toBe(200);
    const u = await t.prisma.db.user.findUniqueOrThrow({ where: { id: f.u.id } });
    const payload = bankTransferOf(
      t.app.get<Env>(ENV),
      pending.amount,
      transferContentOf(u.memberCode, u.phone, pending.code),
    );
    expect(Buffer.from(await image.arrayBuffer()).equals(await vietQrImage(payload.qr))).toBe(true);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: {
          type: 'fundraising.reminded',
          payload: {
            path: ['items'],
            array_contains: [
              {
                fundraisingId: f.f.id,
                projectId: f.project.id,
                projectName: f.project.name,
                ownerId: f.u.id,
                amount: f.f.amount,
                kind: 'expired',
                endsAt: f.endsAt.toISOString(),
              },
            ],
          },
        },
      }),
    ).toBe(1);
    const signer = t.app.get(MailQrToken);
    expect(
      (await t.call(`/public/mail-qr/${signer.sign({ kind: 'fundraising', id: f.f.id })}.png`))
        .status,
    ).toBe(404);
    await t.prisma.db.projectFundraising.update({
      where: { id: pending.id },
      data: { status: 'pending_review', paidAt: new Date() },
    });
    expect((await t.call(new URL(url).pathname.replace(/^\/v1/, ''))).status).toBe(404);
  });

  it('Q821-11 reuses a pending renewal and the member start flow returns that same code', async () => {
    const f = await fixture(-1);
    const { FundraisingService } = await import('@/modules/project/services/fundraising.service');
    const service = t.app.get(FundraisingService);
    const started = await service.start(f.u.id, f.project.id);
    await t.app.get(FundraisingSchedulerService).run();
    const again = await service.start(f.u.id, f.project.id);
    expect(again.id).toBe(started.id);
    expect(again.code).toBe(started.code);
    expect(again.status).toBe('pending_payment');
    expect(
      await t.prisma.db.projectFundraising.count({
        where: { projectId: f.project.id, status: 'pending_payment' },
      }),
    ).toBe(1);
    const mail = await t.prisma.db.mailLog.findFirstOrThrow({
      where: { to: f.u.email, kind: 'fundraising_expired' },
    });
    expect(mail.bodyHtml).toContain(started.code ?? 'missing');
  });
  it('Q821-11 mail/outbox failure rolls back expiry and the new payable request atomically', async () => {
    const f = await fixture(-1);
    const spy = vi
      .spyOn(t.app.get(MailService), 'requestMany')
      .mockRejectedValueOnce(new Error('TIP821 injected mail failure'));
    try {
      await expect(t.app.get(FundraisingSchedulerService).run()).rejects.toThrow(
        'TIP821 injected mail failure',
      );
    } finally {
      spy.mockRestore();
    }
    expect(
      (await t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id: f.f.id } })).status,
    ).toBe('active');
    expect(
      await t.prisma.db.projectFundraising.count({
        where: { projectId: f.project.id, status: 'pending_payment' },
      }),
    ).toBe(0);
    expect(
      await t.prisma.db.mailLog.count({ where: { to: f.u.email, kind: 'fundraising_expired' } }),
    ).toBe(0);
    await t.app.get(FundraisingSchedulerService).run();
    expect(
      await t.prisma.db.projectFundraising.count({
        where: { projectId: f.project.id, status: 'pending_payment' },
      }),
    ).toBe(1);
  });
  it('Q821-11 concurrent expiry workers allocate one pending code and one mail', async () => {
    const f = await fixture(-1);
    const job = t.app.get(FundraisingSchedulerService);
    await Promise.all([job.run(), job.run()]);
    expect(
      await t.prisma.db.projectFundraising.count({
        where: { projectId: f.project.id, status: 'pending_payment' },
      }),
    ).toBe(1);
    expect(
      await t.prisma.db.mailLog.count({ where: { to: f.u.email, kind: 'fundraising_expired' } }),
    ).toBe(1);
    expect(
      (await t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id: f.f.id } })).status,
    ).toBe('expired');
  });
});
