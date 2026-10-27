import type { FakeBankProvider } from '@opchub/integrations';
import { fundraisingPaymentSchema } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BANK } from '@/common/integrations';
import { MailCoreModule, ReceiptMailHandler } from '@/modules/mail';
import { ReconcileService } from '@/modules/membership-fee';
import { tokenOf } from '../factories/group.factory';
import { FUNDRAISING_PLAN, planAmount } from '../factories/prices';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const FUNDING = { amount: 2_000_000_000, currency: 'VND' as const, equityPercent: 10 };

/**
 * TIP-V42-704 (D-113 F4): CK tự khớp → outbox `membership_fee.confirmed` / `fundraising.paid` →
 * mail biên nhận (kind `receipt`); relay gọi lại không gửi trùng.
 */
describe('email biên nhận (TIP-V42-704)', () => {
  let t: TestApp;
  let bank: FakeBankProvider;
  beforeAll(async () => {
    t = await createTestApp({ imports: [MailCoreModule] });
    bank = t.app.get<FakeBankProvider>(BANK);
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestProjects(t);
    await t.close();
  });

  const pay = async (content: string, amount: number) => {
    const bankTxnId = `rc-${randomUUID()}`;
    const signed = bank.sign({ id: bankTxnId, amount, content });
    await t.call('/webhooks/bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...signed.headers },
      body: signed.rawBody,
    });
    const row = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { bankTxnId },
      select: { id: true },
    });
    return t.app.get(ReconcileService).match(row.id);
  };
  const receipts = (to: string) =>
    t.prisma.db.mailLog.findMany({
      where: { to, kind: 'receipt' },
      select: { subject: true, priority: true },
    });

  it('phí thành viên: CK đúng giá → 1 mail biên nhận ưu tiên 3; relay gọi lại không trùng', async () => {
    const u = await createUser(t, { fee: 'pending_payment' });
    const code = await assignMemberCode(t, u.id);
    expect(await pay(`OPCHUB ${code} 0912345678`, planAmount('personal'))).toMatchObject({
      matched: true,
    });
    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'membership_fee.confirmed', payload: { path: ['userId'], equals: u.id } },
      select: { payload: true },
    });
    const payload = parseOutboxPayload('membership_fee.confirmed', ev.payload);
    const handler = t.app.get(ReceiptMailHandler);
    await handler.feeConfirmed(payload);
    await handler.feeConfirmed(payload);
    const rows = await receipts(u.email);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.subject).toMatch(/^Biên nhận phí thành viên OPC Hub · BN-[0-9A-F]{8}$/);
    expect(rows[0]?.priority).toBe(3);
  });

  it('Gói Gọi vốn: CK đúng mẫu → 1 mail biên nhận theo mã GV; relay gọi lại không trùng', async () => {
    const u = await createUser(t, { fee: 'active' });
    await assignMemberCode(t, u.id);
    const token = await tokenOf(t, u);
    const p = await createProject(t, token, { funding: FUNDING });
    const f = fundraisingPaymentSchema.parse(
      await (await t.call(`/projects/${p.id}/fundraising`, { method: 'POST', token })).json(),
    );
    expect(await pay(f.transferContent, FUNDRAISING_PLAN.amount)).toMatchObject({
      matched: true,
      fundraising: true,
    });
    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'fundraising.paid', payload: { path: ['fundraisingId'], equals: f.id } },
      select: { payload: true },
    });
    const payload = parseOutboxPayload('fundraising.paid', ev.payload);
    const handler = t.app.get(ReceiptMailHandler);
    await handler.fundraisingPaid(payload);
    await handler.fundraisingPaid(payload);
    const rows = await receipts(u.email);
    expect(rows).toEqual([{ subject: `Biên nhận Gói Gọi vốn OPC Hub · ${f.code}`, priority: 3 }]);
  });
});
