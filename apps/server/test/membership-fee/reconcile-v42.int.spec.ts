import type { FakeBankProvider } from '@opchub/integrations';
import {
  fundraisingPaymentSchema,
  pendingFundraisingListSchema,
  unmatchedTxnPageSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BANK } from '@/common/integrations';
import { ReconcileService } from '@/modules/membership-fee';
import { FUNDRAISING_PLAN } from '../factories/prices';
import { tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const NOW = new Date('2026-10-28T03:00:00Z');
const FUNDING = { amount: 2_000_000_000, currency: 'VND' as const, equityPercent: 10 };

/**
 * TIP-V42-704 (D-104, D-105, D-113 F3): Gọi vốn đúng số tiền, nội dung cũ thiếu Mã TV vào hàng đợi tay,
 * kế toán khớp tay giao dịch "Cần đối soát" vào khoản Gọi vốn chờ thanh toán.
 */
describe('đối soát Gọi vốn §28.1 + khớp tay (TIP-V42-704)', () => {
  let t: TestApp;
  let bank: FakeBankProvider;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp();
    bank = t.app.get<FakeBankProvider>(BANK);
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestProjects(t);
    await t.close();
  });

  /** Webhook đã ký + chạy job khớp đồng bộ → kết quả khớp và id giao dịch */
  const pay = async (content: string, amount: number) => {
    const bankTxnId = `v42-${randomUUID()}`;
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
    return { id: row.id, result: await t.app.get(ReconcileService).match(row.id, NOW) };
  };
  const statusOf = async (id: string) =>
    (await t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id } })).status;
  const match = (txnId: string, json: unknown, token = admin) =>
    t.call(`/admin/fees/transactions/${txnId}/match`, { method: 'POST', token, json });

  async function pendingFundraising() {
    const u = await createUser(t, { fee: 'active' });
    const code = await assignMemberCode(t, u.id);
    const token = await tokenOf(t, u);
    const p = await createProject(t, token, { funding: FUNDING });
    const res = await t.call(`/projects/${p.id}/fundraising`, { method: 'POST', token });
    return { u, code, p, f: fundraisingPaymentSchema.parse(await res.json()) };
  }

  it('D-105 thừa tiền → unmatched "Số tiền lớn hơn Gói Gọi vốn", khoản vẫn chờ thanh toán', async () => {
    const { f } = await pendingFundraising();
    const { result } = await pay(f.transferContent, FUNDRAISING_PLAN.amount + 1_000);
    expect(result).toEqual({ matched: false, reason: 'Số tiền lớn hơn Gói Gọi vốn' });
    expect(await statusOf(f.id)).toBe('pending_payment');
  });

  it('Q-V42-704-3 nội dung cũ "OPCHUB GVxxxxxx" (thiếu Mã TV) → hàng đợi tay, có gợi ý mã GV', async () => {
    const { f } = await pendingFundraising();
    const { id, result } = await pay(`OPCHUB ${f.code}`, FUNDRAISING_PLAN.amount);
    expect(result).toEqual({ matched: false, reason: 'Không tìm thấy Mã TV trong nội dung' });
    expect(await statusOf(f.id)).toBe('pending_payment');
    const list = unmatchedTxnPageSchema.parse(
      await (await t.call('/admin/fees/transactions?size=100', { token: admin })).json(),
    );
    expect(list.items.find((x) => x.id === id)?.fundraisingHint).toBe(f.code);
  });

  it('D-113 F3 danh sách khoản Gọi vốn chờ thanh toán: tìm theo mã GV / Mã TV; thiếu quyền → 403', async () => {
    const { f, code, p } = await pendingFundraising();
    const byCode = pendingFundraisingListSchema.parse(
      await (await t.call(`/admin/fees/fundraisings/pending?q=${f.code}`, { token: admin })).json(),
    );
    expect(byCode.items).toEqual([
      expect.objectContaining({
        id: f.id,
        code: f.code,
        projectName: p.name,
        ownerCode: code,
        amount: FUNDRAISING_PLAN.amount,
      }),
    ]);
    const byOwner = pendingFundraisingListSchema.parse(
      await (
        await t.call(`/admin/fees/fundraisings/pending?q=${code.toLowerCase()}`, { token: admin })
      ).json(),
    );
    expect(byOwner.items.map((i) => i.id)).toContain(f.id);
    const mod = await tokenOf(t, await createUser(t, { systemRole: 'moderator' }));
    const res = await t.call('/admin/fees/fundraisings/pending', { token: mod });
    expect(res.status).toBe(403);
  });

  it('D-113 F3 khớp tay vào Gói Gọi vốn → chờ thẩm định + audit + outbox; lần 2 → 409; mã lạ → 404', async () => {
    const { f, u } = await pendingFundraising();
    // Thiếu tiền vẫn khớp tay được (như QĐ-01 phí thành viên)
    const { id } = await pay(`OPCHUB ${f.code} thieu`, FUNDRAISING_PLAN.amount - 500_000);
    expect(
      (await match(id, { kind: 'fundraising', fundraisingId: randomUUID(), reason: 'x' })).status,
    ).toBe(404);
    const body = { kind: 'fundraising', fundraisingId: f.id, reason: 'Khách chuyển thiếu mã TV' };
    expect((await match(id, body)).status).toBe(204);
    expect(await statusOf(f.id)).toBe('pending_review');
    const txn = await t.prisma.db.paymentTransaction.findUniqueOrThrow({
      where: { id },
      select: { matchStatus: true, matchedUserId: true },
    });
    expect(txn).toEqual({ matchStatus: 'manual', matchedUserId: u.id });
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { action: 'fundraising.match_transaction', entityId: id },
      select: { tag: true, diff: true },
    });
    expect(audit.tag).toBe('project');
    expect(audit.diff).toMatchObject({ fundraisingId: f.id, reason: body.reason });
    const events = await t.prisma.db.outboxEvent.count({
      where: { type: 'fundraising.paid', payload: { path: ['fundraisingId'], equals: f.id } },
    });
    expect(events).toBe(1);
    expect((await match(id, body)).status).toBe(409);
    // Giao dịch khác vào khoản đã chờ thẩm định → 409 "không còn chờ thanh toán"
    const other = await pay(`OPCHUB ${f.code} lan 2`, FUNDRAISING_PLAN.amount);
    const res = await match(other.id, body);
    expect(res.status).toBe(409);
    expect(await res.text()).toContain('Gói Gọi vốn không còn chờ thanh toán');
  });

  it('khớp tay thiếu lý do → 400; moderator → 403', async () => {
    const { f } = await pendingFundraising();
    const { id } = await pay(`OPCHUB ${f.code} x`, FUNDRAISING_PLAN.amount);
    expect((await match(id, { kind: 'fundraising', fundraisingId: f.id, reason: '' })).status).toBe(
      400,
    );
    const mod = await tokenOf(t, await createUser(t, { systemRole: 'moderator' }));
    const res = await match(id, { kind: 'fundraising', fundraisingId: f.id, reason: 'x' }, mod);
    expect(res.status).toBe(403);
    expect(await statusOf(f.id)).toBe('pending_payment');
  });
});
