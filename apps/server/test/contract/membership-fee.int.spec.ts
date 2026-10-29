import { planAmount } from '../factories/prices';
import type { FakeBankProvider } from '@opchub/integrations';
import { pageSchema } from '@opchub/shared/api';
import {
  feeBulkCollectResponseSchema,
  feeBulkRemindResponseSchema,
  feeExportResponseSchema,
  feeRowSchema,
  feeSummarySchema,
  myMembershipSchema,
  transferConfirmResponseSchema,
  unmatchedTxnPageSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BANK } from '@/common/integrations';
import { tokenOf } from '../factories/group.factory';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

/** Webhook + dev simulate: controller trả `{ received }` (không có schema shared — FE không gọi) */
const receivedSchema = z.object({ received: z.number().int().min(0) });
const FEE = planAmount('personal');

/**
 * Contract `membership-fee` (13) — schema đúng như apps/admin/src/features/fees/api.ts và
 * apps/portal/src/features/membership/api.ts; phần FE không gọi dùng schema controller `respond`.
 */
describe('Contract: membership-fee', () => {
  let t: TestApp;
  let admin: string;
  const tag = `ctr-fee-${randomUUID().slice(0, 8)}`;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    await t.prisma.db.paymentTransaction.deleteMany({ where: { content: { contains: tag } } });
    await t.close();
  });

  it('portal: xem phí của mình + xác nhận đã chuyển khoản', async () => {
    const u = await createUser(t, { fee: 'pending_payment' });
    await assignMemberCode(t, u.id);
    const token = await tokenOf(t, u);
    const mine = await ep(t, 'GET', '/me/membership', '/me/membership', myMembershipSchema, {
      token,
    });
    expect(mine.data.status).toBe('pending_payment');
    await ep(
      t,
      'POST',
      '/me/membership/transfer-confirm',
      '/me/membership/transfer-confirm',
      transferConfirmResponseSchema,
      { token },
    );
  });

  it('webhook ký HMAC + dev simulate → giao dịch không khớp → khớp tay', async () => {
    const bank = t.app.get<FakeBankProvider>(BANK);
    const signed = bank.sign({ id: `t-${randomUUID()}`, amount: FEE, content: `${tag} webhook` });
    const hook = await ep(t, 'POST', '/webhooks/bank', '/webhooks/bank', receivedSchema, {
      headers: { 'Content-Type': 'application/json', ...signed.headers },
      body: signed.rawBody,
    });
    expect(hook.data.received).toBe(1);
    await ep(t, 'POST', '/dev/bank/simulate', '/dev/bank/simulate', receivedSchema, {
      json: { id: `t-${randomUUID()}`, amount: FEE, content: `${tag} simulate` },
    });

    const tx = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content: `${tag} simulate`, matchStatus: 'unmatched' },
      select: { id: true, receivedAt: true },
    });
    const before = new Date(tx.receivedAt.getTime() + 1).toISOString();
    const list = await ep(
      t,
      'GET',
      '/admin/fees/transactions',
      `/admin/fees/transactions?size=100&before=${encodeURIComponent(before)}`,
      unmatchedTxnPageSchema,
      { token: admin },
    );
    expect(list.data.items.some((x) => x.id === tx.id)).toBe(true);

    const payer = await createUser(t, { fee: 'pending_payment' });
    await ep(
      t,
      'POST',
      '/admin/fees/transactions/:id/match',
      `/admin/fees/transactions/${tx.id}/match`,
      null,
      { token: admin, json: { userId: payer.id, reason: 'Hợp đồng: khớp tay' } },
      204,
    );
  });

  it('admin: danh sách, tóm tắt, thao tác dòng, thu hàng loạt, nhắc, xuất', async () => {
    const a = await createUser(t, { fee: 'pending_payment' });
    const code = await assignMemberCode(t, a.id);
    const b = await createUser(t, { fee: 'expired' });
    const c = await createUser(t, { fee: 'expiring' });

    const page = await ep(
      t,
      'GET',
      '/admin/fees',
      `/admin/fees?page=1&size=10&status=pending_payment&q=${code}`,
      pageSchema(feeRowSchema),
      { token: admin },
    );
    expect(page.data.items.map((x) => x.userId)).toEqual([a.id]);
    await ep(t, 'GET', '/admin/fees/summary', '/admin/fees/summary', feeSummarySchema, {
      token: admin,
    });
    const row = await ep(
      t,
      'POST',
      '/admin/fees/:uid/:action',
      `/admin/fees/${a.id}/collect`,
      feeRowSchema,
      { token: admin },
    );
    expect(row.data.status).toBe('active');
    const bulk = await ep(
      t,
      'POST',
      '/admin/fees/collect',
      '/admin/fees/collect',
      feeBulkCollectResponseSchema,
      { token: admin, json: { userIds: [b.id] } },
    );
    expect(bulk.data.updated).toBe(1);
    await ep(t, 'POST', '/admin/fees/remind', '/admin/fees/remind', feeBulkRemindResponseSchema, {
      token: admin,
      json: { userIds: [c.id] },
    });
    // Nhắc toàn bộ chỉ ghi mail_logs + outbox (fake mail ở test), không gửi thật
    await ep(
      t,
      'POST',
      '/admin/fees/remind-all',
      '/admin/fees/remind-all',
      feeBulkRemindResponseSchema,
      { token: admin },
    );
    const csv = await ep(
      t,
      'POST',
      '/admin/fees/export',
      '/admin/fees/export',
      feeExportResponseSchema,
      { token: admin, json: { userIds: [a.id, b.id] } },
    );
    expect(csv.data.csv).toContain(a.email);
  });
});
