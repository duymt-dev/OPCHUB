import type { FakeBankProvider } from '@opchub/integrations';
import { FUNDRAISING_PLAN } from '../factories/prices';
import {
  adminProjectSchema,
  fundraisingPaymentSchema,
  myFundraisingsSchema,
  projectDetailSchema,
} from '@opchub/shared/api-domains';
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

const NOW = new Date('2026-10-24T03:00:00Z');
const FUNDING = { amount: 2_000_000_000, currency: 'VND' as const, equityPercent: 10 };

/**
 * TIP-V4-610 (UP-11, AD-06, D-70, D-82): mua Gói Gọi vốn (mã GV) → đối soát → Admin thẩm định →
 * tab Gọi vốn + quan tâm; hoa hồng % Gọi vốn cho đại lý giới thiệu chủ dự án.
 */
describe('Gói Gọi vốn (TIP-V4-610)', () => {
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
  const review = (pid: string, fid: string, decision: 'approve' | 'reject') =>
    t.call(`/admin/projects/${pid}/fundraising/${fid}/review`, {
      method: 'POST',
      token: admin,
      json: { decision },
    });
  const statusOf = async (id: string) =>
    (await t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id } })).status;

  async function ownerWithProject() {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, u);
    const p = await createProject(t, token, { funding: FUNDING });
    return { u, token, p };
  }

  it('tạo khoản: mã GV 6 số, gọi lại cùng mã; NĐT 403; người khác 404', async () => {
    const { token, p } = await ownerWithProject();
    const a = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    expect(a).toMatchObject({ amount: FUNDRAISING_PLAN.amount, status: 'pending_payment' });
    expect(a.code).toMatch(/^GV\d{6}$/);
    expect(a.transferContent).toBe(`OPCHUB ${a.code}`);
    const b = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    expect(b.id).toBe(a.id);
    const other = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await start(other, p.id)).status).toBe(404);
    const inv = await tokenOf(t, await createUser(t, { accountType: 'investor' }));
    expect((await start(inv, p.id)).status).toBe(403);
    const mine = myFundraisingsSchema.parse(
      await (await t.call('/me/fundraisings', { token })).json(),
    );
    expect(mine.items.map((i) => i.id)).toEqual([a.id]);
  });

  it('đối soát: thiếu tiền → unmatched; đủ → chờ thẩm định, chạy lại không đổi; tab chưa hiện', async () => {
    const { token, p } = await ownerWithProject();
    const f = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    const low = await pay(`OPCHUB ${f.code} lan 1`, FUNDRAISING_PLAN.amount - 1_000_000);
    expect(low).toEqual({ matched: false, reason: 'Số tiền nhỏ hơn Gói Gọi vốn' });
    expect(await statusOf(f.id)).toBe('pending_payment');
    const ok = await pay(
      `opchub${(f.code ?? '').toLowerCase()} 0912345678`,
      FUNDRAISING_PLAN.amount,
    );
    expect(ok).toMatchObject({ matched: true, fundraising: true });
    expect(await statusOf(f.id)).toBe('pending_review');
    expect(await pay(`OPCHUB ${f.code} lan 3`, FUNDRAISING_PLAN.amount)).toMatchObject({
      matched: false,
    });
    expect((await start(token, p.id)).status).toBe(409);
    const viewer = await tokenOf(t, await createUser(t, { accountType: 'investor' }));
    const d = projectDetailSchema.parse(
      await (await t.call(`/projects/${p.id}`, { token: viewer })).json(),
    );
    expect(d).toMatchObject({ fundraisingActive: false, funding: null });
  });

  it('Admin duyệt → active 6 tháng + audit + tab Gọi vốn + quan tâm; duyệt lại 409', async () => {
    const { token, p } = await ownerWithProject();
    const f = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    await pay(`OPCHUB ${f.code}`, FUNDRAISING_PLAN.amount);
    const list = await t.call(`/admin/projects/${p.id}`, { token: admin });
    expect(adminProjectSchema.parse(await list.json()).fundraising).toMatchObject({
      id: f.id,
      status: 'pending_review',
    });
    expect((await review(p.id, f.id, 'approve')).status).toBe(204);
    expect((await review(p.id, f.id, 'approve')).status).toBe(409);
    const row = await t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id: f.id } });
    expect(row.status).toBe('active');
    const months = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();
    expect(row.startsAt && row.endsAt && months(row.endsAt) - months(row.startsAt)).toBe(
      FUNDRAISING_PLAN.months,
    );
    const audit = await t.prisma.db.auditLog.findFirst({ where: { entityId: f.id } });
    expect(audit).toMatchObject({ action: 'project.fundraising_approve', tag: 'project' });
    const inv = await tokenOf(t, await createUser(t, { accountType: 'investor' }));
    const d = projectDetailSchema.parse(
      await (await t.call(`/projects/${p.id}`, { token: inv })).json(),
    );
    expect(d.fundraisingActive).toBe(true);
    expect(d.funding?.amount).toBe(FUNDING.amount);
    const interest = await t.call(`/projects/${p.id}/interest`, {
      method: 'POST',
      token: inv,
      headers: { 'Idempotency-Key': randomUUID() },
      json: {
        kind: 'individual',
        contactName: 'NĐT thử',
        phone: '0912345678',
        organization: '',
        amount: 100_000_000,
      },
    });
    expect(interest.status).toBe(201);
  });

  it('từ chối → rejected, không hiện tab; quan tâm → 404', async () => {
    const { token, p } = await ownerWithProject();
    const f = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    await pay(`OPCHUB ${f.code}`, FUNDRAISING_PLAN.amount);
    expect((await review(p.id, f.id, 'reject')).status).toBe(204);
    expect(await statusOf(f.id)).toBe('rejected');
    const inv = await tokenOf(t, await createUser(t, { accountType: 'investor' }));
    const r = await t.call(`/projects/${p.id}/interest`, {
      method: 'POST',
      token: inv,
      headers: { 'Idempotency-Key': randomUUID() },
      json: {
        kind: 'individual',
        contactName: 'NĐT thử',
        phone: '0912345678',
        organization: '',
        amount: 100_000_000,
      },
    });
    expect(r.status).toBe(404);
  });

  it('D-70: duyệt → hoa hồng % Gọi vốn cho đại lý giới thiệu chủ dự án, không trùng', async () => {
    const { affiliate } = await createAffiliate(t, NOW);
    const owner = await createReferral(t, affiliate.id, affiliate.code);
    // Chủ dự án đóng phí lần đầu → hoa hồng phí thành viên (referral converted)
    await t.app.get(AffiliateLifecycleHandler).onFeeConfirmed(await confirmFee(t, owner.id, NOW));
    await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: { fundraisingRate: 12 } });
    try {
      const token = await tokenOf(t, owner);
      const p = await createProject(t, token, { funding: FUNDING });
      const f = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
      await pay(`OPCHUB ${f.code}`, FUNDRAISING_PLAN.amount);
      await review(p.id, f.id, 'approve');
      const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
        where: { type: 'fundraising.reviewed', payload: { path: ['fundraisingId'], equals: f.id } },
        select: { payload: true },
      });
      const handler = t.app.get(FundraisingCommissionHandler);
      const payload = parseOutboxPayload('fundraising.reviewed', ev.payload);
      await handler.onReviewed(payload);
      await handler.onReviewed(payload);
      const rows = await t.prisma.db.commission.findMany({
        where: { referredUserId: owner.id },
        select: { source: true, amount: true, rate: true, listAmount: true },
        orderBy: { source: 'asc' },
      });
      expect(rows).toEqual([
        expect.objectContaining({ source: 'membership' }),
        { source: 'fundraising', amount: 1_800_000, rate: 12, listAmount: FUNDRAISING_PLAN.amount },
      ]);
    } finally {
      await t.prisma.db.affiliatePolicy.update({ where: { id: 1 }, data: { fundraisingRate: 10 } });
    }
  });
});
