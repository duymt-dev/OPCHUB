import { randomUUID } from 'node:crypto';
import { transferContentOf } from '@opchub/shared';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { FakeBankProvider } from '@opchub/integrations';
import { BANK } from '@/common/integrations';
import { ReconcileService } from '@/modules/membership-fee';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
  await flushAuthState(t);
});
afterAll(() => t.close());

it('Q-V46-801-1 matching bank transfer stays unmatched without extending exempt fees', async () => {
  const u = await createUser(t, { fee: 'regional_director' });
  const code = await assignMemberCode(t, u.id);
  const fee = await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } });
  const id = randomUUID();
  const signed = t.app.get<FakeBankProvider>(BANK).sign({
    id,
    amount: fee.amount,
    content: transferContentOf(code, u.phone),
  });
  expect(
    (
      await t.call('/webhooks/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...signed.headers },
        body: signed.rawBody,
      })
    ).ok,
  ).toBe(true);
  const payment = await t.prisma.db.paymentTransaction.findFirstOrThrow({
    where: { bankTxnId: id },
  });
  expect(await t.app.get(ReconcileService).match(payment.id, new Date())).toEqual({
    matched: false,
    reason: 'Thành viên đang Miễn phí · GĐ Vùng',
  });
  expect(await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } })).toEqual(
    fee,
  );
  expect(
    (await t.prisma.db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } }))
      .matchStatus,
  ).toBe('unmatched');
});
