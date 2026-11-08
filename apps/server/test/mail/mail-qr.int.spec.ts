import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENV, type Env } from '@/common/config';
import { bankTransferOf } from '@/common/integrations';
import { vietQrImage } from '@/common/integrations/vietqr-image';
import { transferContentOf } from '@opchub/shared';
import { MailQrToken } from '@/modules/mail';
import { RenewalDeliveryService } from '@/modules/membership-fee/services/renewal-delivery.service';
import { RenewalRepository } from '@/modules/membership-fee/repositories/renewal.repository';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('TIP-V46-821 D-96 signed first-party mail QR', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    if (t) await t.close();
  });
  it('SPEC11/12 D1 mail contains image and text; PNG uses current invoice, payment invalidates old link', async () => {
    const user = await createUser(t, { fee: 'active' });
    const now = new Date(),
      until = new Date(now.getTime() + 86_400_000);
    await t.prisma.db.membershipFee.update({
      where: { userId: user.id },
      data: { validUntil: until },
    });
    const rows = await t.app
      .get(RenewalRepository)
      .rows(now, new Date(now.getTime() + 2 * 86_400_000), undefined, 2, [user.id]);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (!row) throw new Error('Missing fixture');
    await t.prisma.db.$transaction((tx) =>
      t.app
        .get(RenewalDeliveryService)
        .deliver(tx, [{ row, milestone: 'D1' }], { email: true, app: false }, now),
    );
    const mail = await t.prisma.db.mailLog.findFirstOrThrow({
      where: { to: user.email, kind: 'fee_reminder' },
    });
    expect(mail.bodyHtml).toContain('<img');
    expect(mail.bodyHtml).toContain('Ngân hàng:');
    expect(mail.bodyHtml).toContain('Nội dung: OPCHUB');
    const link = mail.bodyHtml?.match(/src="([^"]+\/v1\/public\/mail-qr\/[^"]+\.png)"/)?.[1];
    expect(link).toBeTruthy();
    const url = new URL(link ?? '');
    const response = await t.call(url.pathname.replace(/^\/v1/, ''));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect(response.headers.get('cache-control')).toBe('private, max-age=86400');
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.readUInt32BE(16)).toBe(320);
    expect(bytes.readUInt32BE(20)).toBe(320);
    const member = await t.prisma.db.user.findUniqueOrThrow({ where: { id: user.id } });
    const expected = bankTransferOf(
      t.app.get<Env>(ENV),
      row.amount,
      transferContentOf(member.memberCode, member.phone),
    );
    expect(bytes.equals(await vietQrImage(expected.qr))).toBe(true);
    await t.prisma.db.membershipFee.update({
      where: { userId: user.id },
      data: { amount: row.amount + 1000 },
    });
    const refreshed = await t.call(url.pathname.replace(/^\/v1/, ''));
    expect(
      Buffer.from(await refreshed.arrayBuffer()).equals(
        await vietQrImage(
          bankTransferOf(t.app.get<Env>(ENV), row.amount + 1000, expected.transferContent).qr,
        ),
      ),
    ).toBe(true);
    await t.prisma.db.membershipFee.update({
      where: { userId: user.id },
      data: { paidAt: new Date(), validUntil: new Date(until.getTime() + 365 * 86_400_000) },
    });
    expect((await t.call(url.pathname.replace(/^\/v1/, ''))).status).toBe(404);
  });
  it('SPEC11 malformed, tampered, unknown and expired tokens share the same404 envelope', async () => {
    const signer = t.app.get(MailQrToken),
      now = new Date();
    const raw = signer.sign({ kind: 'fundraising', id: 'unknown-invoice' });
    const expired = signer.sign(
      { kind: 'fundraising', id: 'unknown-invoice' },
      new Date(now.getTime() - 31 * 86_400_000),
    );
    for (const token of [
      'invalid',
      raw,
      raw.slice(0, -1) + (raw.endsWith('a') ? 'b' : 'a'),
      expired,
    ]) {
      const r = await t.call(`/public/mail-qr/${token}.png`);
      expect(r.status).toBe(404);
      expect(await r.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    }
  });
});
