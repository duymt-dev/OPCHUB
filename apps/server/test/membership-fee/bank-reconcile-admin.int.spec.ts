import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bankSettingsSchema,
  bankTxnPageSchema,
  bankKeyRotateResultSchema,
  feeExportResponseSchema,
} from '@opchub/shared/api-domains';
import type { FakeBankProvider } from '@opchub/integrations';
import { AuditService } from '@/common/audit';
import { BANK } from '@/common/integrations';
import { ENV, loadEnv } from '@/common/config';
import { BankReconcileAdminService } from '@/modules/membership-fee/services/bank-reconcile-admin.service';
import { ReconcileService } from '@/modules/membership-fee';
import { AppSettingsService } from '@/modules/settings';
import {
  createUser,
  assignMemberCode,
  flushAuthState,
  loginOf,
  tokenBodySchema,
} from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-621 bank reconciliation admin D-135', () => {
  let t: TestApp, token: string, actor: string, bank: FakeBankProvider, reconcile: ReconcileService;
  const prefix = `bank806-${randomUUID()}`;
  const memberIds: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
    bank = t.app.get(BANK);
    reconcile = t.app.get(ReconcileService);
    const admin = await createUser(t, { systemRole: 'admin' });
    actor = admin.id;
    token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
  });
  const reset = async () => {
    await t.prisma.db.bankWebhookKey.deleteMany();
    await t.redis.client.del('bank:webhook-key', 'bank:webhook-key-version');
    await t.prisma.db.appSetting.upsert({
      where: { key: 'bank' },
      create: { key: 'bank', value: { autoActivate: true } },
      update: { value: { autoActivate: true } },
    });
    await t.app.get(AppSettingsService).invalidate('bank');
  };
  beforeEach(async () => {
    vi.restoreAllMocks();
    await flushAuthState(t);
    await reset();
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await reset();
    await t.prisma.db.user.deleteMany({ where: { id: { in: memberIds } } });
    await t.prisma.db.paymentTransaction.deleteMany({
      where: {
        OR: [{ provider: prefix }, { provider: 'fake', bankTxnId: { startsWith: prefix } }],
      },
    });
    await t.close();
  });
  async function member() {
    const u = await createUser(t, { fee: 'pending_payment' });
    memberIds.push(u.id);
    const code = await assignMemberCode(t, u.id);
    const fee = await t.prisma.db.membershipFee.findUniqueOrThrow({
      where: { userId: u.id },
      select: { amount: true },
    });
    return { ...u, code, amount: fee.amount };
  }
  async function ingress(content: string, amount: number) {
    const id = `${prefix}-${randomUUID()}`,
      signed = bank.sign({ id, content, amount });
    const r = await t.call('/webhooks/bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...signed.headers },
      body: signed.rawBody,
    });
    expect(r.status).toBe(200);
    return t.prisma.db.paymentTransaction.findUniqueOrThrow({
      where: { provider_bankTxnId: { provider: 'fake', bankTxnId: id } },
    });
  }
  const config = async () =>
    bankSettingsSchema.parse(await (await t.call('/admin/settings/bank', { token })).json());
  const patch = (autoActivate: boolean) =>
    t.call('/admin/settings/bank', { token, method: 'PATCH', json: { autoActivate } });
  it('TC-481 auto activate: matched, fee active, system audit and outbox in one transaction', async () => {
    const u = await member(),
      txn = await ingress(`OPCHUB ${u.code} 0912345678`, u.amount);
    expect((await reconcile.match(txn.id)).matched).toBe(true);
    expect(
      (await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } })).status,
    ).toBe('active');
    expect(
      (await t.prisma.db.paymentTransaction.findUniqueOrThrow({ where: { id: txn.id } }))
        .matchStatus,
    ).toBe('matched');
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { action: 'fee.auto_activate', entityId: txn.id },
    });
    expect(audit.actorId).toBeNull();
    expect(audit.diff).toMatchObject({ actor: 'system', userId: u.id });
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'membership_fee.activated', payload: { path: ['userId'], equals: u.id } },
      }),
    ).toBe(1);
    expect((await config()).counts.matched).toBeGreaterThan(0);
  });
  it('auto off waits admin, enabling never replays waiting transactions; TC-482 manual match still works', async () => {
    const u = await member();
    expect((await patch(false)).status).toBe(200);
    const txn = await ingress(`OPCHUB ${u.code} 0912345678`, u.amount);
    expect((await reconcile.match(txn.id)).matched).toBe(false);
    expect(
      (await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } })).status,
    ).toBe('pending_payment');
    expect((await patch(true)).status).toBe(200);
    expect((await reconcile.match(txn.id)).matched).toBe(false);
    const r = await t.call(`/admin/fees/transactions/${txn.id}/match`, {
      token,
      method: 'POST',
      json: { userId: u.id, reason: 'Xác nhận giao dịch chờ' },
    });
    expect(r.status).toBe(204);
    expect(
      (await t.prisma.db.paymentTransaction.findUniqueOrThrow({ where: { id: txn.id } }))
        .matchStatus,
    ).toBe('manual');
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'fee.match_transaction', entityId: txn.id },
      }),
    ).toBe(1);
  });
  it('short record: legacy and coded reasons, note, no activation, second write409', async () => {
    const u = await member(),
      txn = await ingress(`OPCHUB ${u.code} 0912345678`, 1);
    await reconcile.match(txn.id);
    const row = await t.prisma.db.paymentTransaction.findUniqueOrThrow({ where: { id: txn.id } });
    expect(row.raw).toMatchObject({ _unmatchedCode: 'short_amount' });
    const record = () =>
      t.call(`/admin/settings/bank/transactions/${txn.id}/short`, {
        token,
        method: 'POST',
        json: { note: 'Đã liên hệ, không cộng dồn' },
      });
    expect((await record()).status).toBe(204);
    expect((await record()).status).toBe(409);
    expect(
      (await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } })).status,
    ).toBe('pending_payment');
    const saved = await t.prisma.db.paymentTransaction.findUniqueOrThrow({ where: { id: txn.id } });
    expect(saved).toMatchObject({
      matchStatus: 'short',
      shortBy: actor,
      shortNote: 'Đã liên hệ, không cộng dồn',
    });
    expect(
      await t.prisma.db.auditLog.count({ where: { action: 'fee.short_record', entityId: txn.id } }),
    ).toBe(1);
  });
  it('key rotation: old401 immediately, new200, hint-only GET, ciphertext cache, audit has no secret', async () => {
    const old = bank.sign({ id: `${prefix}-old`, amount: 1, content: 'OPCHUB' });
    await config(); // warm old credential cache
    const r = await t.call('/admin/settings/bank/key', { token, method: 'POST' });
    expect(r.status).toBe(200);
    const rotated = bankKeyRotateResultSchema.parse(await r.json());
    const get = await config();
    expect(get.keyHint).toBe(rotated.hint);
    expect(JSON.stringify(get)).not.toContain(rotated.key);
    expect(
      (
        await t.call('/webhooks/bank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...old.headers },
          body: old.rawBody,
        })
      ).status,
    ).toBe(401);
    const signed = bank.sign({ id: `${prefix}-new`, amount: 1, content: 'OPCHUB' }, rotated.key);
    expect(
      (
        await t.call('/webhooks/bank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...signed.headers },
          body: signed.rawBody,
        })
      ).status,
    ).toBe(200);
    const stored = await t.prisma.db.bankWebhookKey.findUniqueOrThrow({ where: { id: 1 } });
    expect(Buffer.from(stored.keyEnc).toString()).not.toContain(rotated.key);
    expect(await t.redis.client.get('bank:webhook-key')).not.toContain(rotated.key);
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { actorId: actor, action: 'bank.key_rotate' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit.diff).toEqual({ hint: rotated.hint });
  });
  it('settings strict schema, audit and transactional rollback', async () => {
    expect(
      (
        await t.call('/admin/settings/bank', {
          token,
          method: 'PATCH',
          json: { autoActivate: true, provider: 'sepay' },
        })
      ).status,
    ).toBe(400);
    const spy = vi
      .spyOn(t.app.get(AuditService), 'log')
      .mockRejectedValueOnce(new Error('audit unavailable'));
    expect((await patch(false)).status).toBe(500);
    spy.mockRestore();
    expect((await config()).autoActivate).toBe(true);
    expect((await patch(false)).status).toBe(200);
    expect(
      await t.prisma.db.auditLog.count({ where: { action: 'settings.bank', actorId: actor } }),
    ).toBeGreaterThan(0);
  });
  it('permissions: accountant list/match/short, config forbidden; lecturer forbidden', async () => {
    const accountant = await createUser(t, { adminPermissions: ['fees.view', 'fees.action'] });
    const at = tokenBodySchema.parse(await (await loginOf(t, accountant)).json()).accessToken;
    expect((await t.call('/admin/settings/bank', { token: at })).status).toBe(403);
    expect((await t.call('/admin/settings/bank/transactions', { token: at })).status).toBe(200);
    const u = await member();
    const short = await ingress(`OPCHUB ${u.code} 0912345678`, 1);
    expect(
      (
        await t.call(`/admin/settings/bank/transactions/${short.id}/short`, {
          token: at,
          method: 'POST',
          json: { note: 'Kế toán đã đối chiếu' },
        })
      ).status,
    ).toBe(204);
    const full = await ingress(`OPCHUB ${u.code} 0912345678`, u.amount);
    expect(
      (
        await t.call(`/admin/fees/transactions/${full.id}/match`, {
          token: at,
          method: 'POST',
          json: { userId: u.id, reason: 'Kế toán xác nhận' },
        })
      ).status,
    ).toBe(204);
    const lecturer = await createUser(t, { adminPermissions: ['members.view'] });
    const lt = tokenBodySchema.parse(await (await loginOf(t, lecturer)).json()).accessToken;
    expect((await t.call('/admin/settings/bank', { token: lt })).status).toBe(403);
    expect((await t.call('/admin/settings/bank/transactions', { token: lt })).status).toBe(403);
    expect((await t.call('/admin/settings/bank/key', { token: at, method: 'POST' })).status).toBe(
      403,
    );
  });
  it('automatic activation audit failure rolls back transaction, fee, period and outbox; retry succeeds', async () => {
    const u = await member(),
      txn = await ingress(`OPCHUB ${u.code} 0912345678`, u.amount);
    const spy = vi
      .spyOn(t.app.get(AuditService), 'log')
      .mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(reconcile.match(txn.id)).rejects.toThrow('audit unavailable');
    spy.mockRestore();
    expect(
      (await t.prisma.db.paymentTransaction.findUniqueOrThrow({ where: { id: txn.id } }))
        .matchStatus,
    ).toBe('unmatched');
    expect(
      (await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } })).status,
    ).toBe('pending_payment');
    expect(await t.prisma.db.membershipFeePeriod.count({ where: { userId: u.id } })).toBe(0);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'membership_fee.activated', payload: { path: ['userId'], equals: u.id } },
      }),
    ).toBe(0);
    expect((await reconcile.match(txn.id)).matched).toBe(true);
  });
  it('key rotation audit failure leaves old credential valid; no partial key replacement', async () => {
    const before = await config();
    const spy = vi
      .spyOn(t.app.get(AuditService), 'log')
      .mockRejectedValueOnce(new Error('audit unavailable'));
    expect((await t.call('/admin/settings/bank/key', { token, method: 'POST' })).status).toBe(500);
    spy.mockRestore();
    expect((await config()).keyHint).toBe(before.keyHint);
    expect(await t.prisma.db.bankWebhookKey.count()).toBe(0);
    await ingress('OPCHUB', 1);
  });
  it('simulate guards production and real providers; connection errors502 never expose adapter token', async () => {
    const prod = await createTestApp({
      overrides: [[ENV, { ...loadEnv(), NODE_ENV: 'production' }]],
    });
    try {
      expect((await prod.app.get(BankReconcileAdminService).config()).canSimulate).toBe(false);
      expect(
        (await prod.call('/admin/settings/bank/simulate', { token, method: 'POST' })).status,
      ).toBe(404);
    } finally {
      await prod.close();
    }
    const real = await createTestApp({
      overrides: [[ENV, { ...loadEnv(), BANK_PROVIDER: 'sepay' }]],
    });
    try {
      expect(
        (await real.call('/admin/settings/bank/simulate', { token, method: 'POST' })).status,
      ).toBe(404);
    } finally {
      await real.close();
    }
    vi.spyOn(bank, 'listSince').mockRejectedValueOnce(new Error('SHOULD_NOT_EXPOSE_ADAPTER_TOKEN'));
    const response = await t.call('/admin/settings/bank/test', { token, method: 'POST' });
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('SHOULD_NOT_EXPOSE_ADAPTER_TOKEN');
  });
  it('list keyset: 45 tied timestamps,20 per page, ignored excluded, safe rows and CSV audit', async () => {
    const at = new Date('2199-01-01T00:00:00Z');
    await t.prisma.db.paymentTransaction.createMany({
      data: Array.from({ length: 45 }, (_, i) => ({
        id: `${prefix}-page-${String(i).padStart(3, '0')}`,
        provider: prefix,
        bankTxnId: String(i),
        amount: 1,
        content: '=SUM(1+1)',
        receivedAt: at,
        raw: {},
      })),
    });
    const first = bankTxnPageSchema.parse(
      await (await t.call('/admin/settings/bank/transactions', { token })).json(),
    );
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).not.toBeNull();
    const second = bankTxnPageSchema.parse(
      await (
        await t.call(
          `/admin/settings/bank/transactions?cursor=${encodeURIComponent(first.nextCursor!)}`,
          { token },
        )
      ).json(),
    );
    expect(second.items).toHaveLength(20);
    expect(new Set([...first.items, ...second.items].map((r) => r.id)).size).toBe(40);
    const csv = feeExportResponseSchema.parse(
      await (await t.call('/admin/settings/bank/export', { token, method: 'POST' })).json(),
    );
    expect(csv.filename).toBe('doi-soat-ngan-hang.csv');
    expect(csv.csv).toContain("'=SUM(1+1)");
    expect(
      await t.prisma.db.auditLog.count({ where: { actorId: actor, action: 'fee.bank_export' } }),
    ).toBeGreaterThan(0);
    expect((await t.call('/admin/settings/bank/transactions?cursor=bad', { token })).status).toBe(
      400,
    );
  });
});
