import type { FakeBankProvider } from '@opchub/integrations';
import { FUNDRAISING_PLAN } from '../factories/prices';
import { fundraisingPaymentSchema } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BANK } from '@/common/integrations';
import {
  AffiliateCoreModule,
  AffiliateLifecycleHandler,
  FundraisingCommissionHandler,
} from '@/modules/affiliate';
import { ReconcileService } from '@/modules/membership-fee';
import { confirmFee, createAffiliate, createReferral } from '../factories/affiliate.factory';
import { tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const NOW = new Date('2026-10-27T03:00:00Z');
const FUNDING = { amount: 2_000_000_000, currency: 'VND' as const, equityPercent: 10 };

/** TIP-V42-701 (D-117): B1 % đại lý không đè khoản Gọi vốn · B2 giá gia hạn · B3 mẫu §28.1 TV + GV */
describe('Gọi vốn — sửa lỗi B1 → B3 (TIP-V42-701)', () => {
  let t: TestApp;
  let bank: FakeBankProvider;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp({ imports: [AffiliateCoreModule] });
    bank = t.app.get<FakeBankProvider>(BANK);
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestProjects(t);
    await t.close();
  });

  const start = (token: string, id: string) =>
    t.call(`/projects/${id}/fundraising`, { method: 'POST', token });
  const pay = async (content: string, amount: number) => {
    const signed = bank.sign({ id: `gv-${randomUUID()}`, amount, content });
    await t.call('/webhooks/bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...signed.headers },
      body: signed.rawBody,
    });
    const row = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return t.app.get(ReconcileService).match(row.id, NOW);
  };
  const review = (pid: string, fid: string) =>
    t.call(`/admin/projects/${pid}/fundraising/${fid}/review`, {
      method: 'POST',
      token: admin,
      json: { decision: 'approve' },
    });
  const statusOf = async (id: string) =>
    (await t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id } })).status;
  const memberCodeOf = async (id: string) =>
    (await t.prisma.db.user.findUniqueOrThrow({ where: { id }, select: { memberCode: true } }))
      .memberCode;

  async function ownerWithProject() {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, u);
    const p = await createProject(t, token, { funding: FUNDING });
    return { u, token, p };
  }

  it('B3: nội dung §28.1 có cả TV và GV → khớp khoản Gọi vốn khi TV đúng chủ', async () => {
    const { u, token, p } = await ownerWithProject();
    const f = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    const code = await memberCodeOf(u.id);
    // Mã TV của factory không theo mẫu TV + 6 số → đặt lại cho đúng mẫu
    const tv = `TV${String(Date.now()).slice(-6)}`;
    await t.prisma.db.user.update({ where: { id: u.id }, data: { memberCode: tv } });
    try {
      const ok = await pay(`OPCHUB ${tv} 0912345678 ${f.code}`, FUNDRAISING_PLAN.amount);
      expect(ok).toMatchObject({ matched: true, fundraising: true });
      expect(await statusOf(f.id)).toBe('pending_review');
    } finally {
      await t.prisma.db.user.update({ where: { id: u.id }, data: { memberCode: code } });
    }
  });

  it('B3: Mã TV không phải chủ khoản → không khớp, khoản giữ chờ thanh toán', async () => {
    const { token, p } = await ownerWithProject();
    const f = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    const other = await createUser(t, { fee: 'active' });
    const code = await memberCodeOf(other.id);
    const tv = `TV${String(Date.now() + 7).slice(-6)}`;
    await t.prisma.db.user.update({ where: { id: other.id }, data: { memberCode: tv } });
    try {
      const r = await pay(`OPCHUB ${tv} 0912345678 ${f.code}`, FUNDRAISING_PLAN.amount);
      expect(r).toEqual({
        matched: false,
        reason: `${tv} không phải chủ Gói Gọi vốn ${f.code}`,
      });
      expect(await statusOf(f.id)).toBe('pending_payment');
    } finally {
      await t.prisma.db.user.update({ where: { id: other.id }, data: { memberCode: code } });
    }
  });

  it('B2: còn hạn → 409; đã hết hạn → khoản mới giá gia hạn', async () => {
    const { token, p } = await ownerWithProject();
    const f = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    expect(f.amount).toBe(FUNDRAISING_PLAN.amount);
    await pay(`OPCHUB ${f.code}`, FUNDRAISING_PLAN.amount);
    expect((await review(p.id, f.id)).status).toBe(204);
    // D-106: còn hạn (kể cả ≤ 14 ngày) → không cho mua sớm
    const soon = new Date(Date.now() + 5 * 86_400_000);
    await t.prisma.db.projectFundraising.update({ where: { id: f.id }, data: { endsAt: soon } });
    expect((await start(token, p.id)).status).toBe(409);
    await t.prisma.db.projectFundraising.update({
      where: { id: f.id },
      data: { status: 'expired', endsAt: new Date(Date.now() - 86_400_000) },
    });
    const r = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    expect(r.id).not.toBe(f.id);
    expect(r.amount).toBe(FUNDRAISING_PLAN.renewAmount);
  });

  it('B1: đổi % đại lý chỉ tính lại hoa hồng phí thành viên, khoản Gọi vốn giữ %', async () => {
    const { affiliate } = await createAffiliate(t, NOW);
    const owner = await createReferral(t, affiliate.id, affiliate.code);
    await t.app.get(AffiliateLifecycleHandler).onFeeConfirmed(await confirmFee(t, owner.id, NOW));
    const token = await tokenOf(t, owner);
    const p = await createProject(t, token, { funding: FUNDING });
    const f = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    await pay(`OPCHUB ${f.code}`, FUNDRAISING_PLAN.amount);
    await review(p.id, f.id);
    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'fundraising.reviewed', payload: { path: ['fundraisingId'], equals: f.id } },
      select: { payload: true },
    });
    await t.app
      .get(FundraisingCommissionHandler)
      .onReviewed(parseOutboxPayload('fundraising.reviewed', ev.payload));
    const before = await t.prisma.db.commission.findFirstOrThrow({
      where: { referredUserId: owner.id, source: 'fundraising' },
      select: { rate: true, amount: true },
    });
    const res = await t.call('/admin/affiliates/rate', {
      method: 'PUT',
      token: admin,
      json: { ids: [affiliate.id], rate: 30 },
    });
    expect(res.status).toBe(200);
    const rows = await t.prisma.db.commission.findMany({
      where: { referredUserId: owner.id },
      select: { source: true, rate: true, amount: true, listAmount: true },
      orderBy: { source: 'asc' },
    });
    const member = rows.find((r) => r.source === 'membership');
    expect(member?.rate).toBe(30);
    expect(member?.amount).toBe(Math.floor((member?.listAmount ?? 0) * 0.3));
    expect(rows.find((r) => r.source === 'fundraising')).toMatchObject(before);
  });
});
