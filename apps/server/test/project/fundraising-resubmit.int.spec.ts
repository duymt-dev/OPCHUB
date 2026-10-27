import type { FakeBankProvider } from '@opchub/integrations';
import { FUNDRAISING_PLAN } from '../factories/prices';
import {
  fundraisingPaymentSchema,
  fundraisingSchema,
  myFundraisingsSchema,
} from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BANK } from '@/common/integrations';
import { ReconcileService } from '@/modules/membership-fee';
import { FundraisingNotifyHandler, NotificationCoreModule } from '@/modules/notification';
import { tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const FUNDING = { amount: 2_000_000_000, currency: 'VND' as const, equityPercent: 10 };

/** TIP-V42-706 (D-113 F6, §27.5b): Gọi vốn bị từ chối → bổ sung hồ sơ → duyệt lại, không thu lần hai */
describe('Gọi vốn — bị từ chối → gửi duyệt lại (TIP-V42-706)', () => {
  let t: TestApp;
  let bank: FakeBankProvider;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp({ imports: [NotificationCoreModule] });
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
  const resubmit = (token: string, id: string) =>
    t.call(`/me/fundraisings/${id}/resubmit`, {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': randomUUID() },
    });
  const review = (pid: string, fid: string, decision: 'approve' | 'reject', note?: string) =>
    t.call(`/admin/projects/${pid}/fundraising/${fid}/review`, {
      method: 'POST',
      token: admin,
      json: { decision, note },
    });
  const row = (id: string) => t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id } });

  /** Chủ dự án mua Gói Gọi vốn, CK đúng → chờ thẩm định → Admin từ chối */
  async function rejected() {
    const u = await createUser(t, { fee: 'active' });
    await assignMemberCode(t, u.id);
    const token = await tokenOf(t, u);
    const p = await createProject(t, token, { funding: FUNDING });
    const f = fundraisingPaymentSchema.parse(await (await start(token, p.id)).json());
    const signed = bank.sign({
      id: `gv-${randomUUID()}`,
      amount: FUNDRAISING_PLAN.amount,
      content: f.transferContent,
    });
    await t.call('/webhooks/bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...signed.headers },
      body: signed.rawBody,
    });
    const txn = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content: f.transferContent },
      select: { id: true },
    });
    await t.app.get(ReconcileService).match(txn.id, new Date());
    expect((await row(f.id)).status).toBe('pending_review');
    expect((await review(p.id, f.id, 'reject', 'Thiếu báo cáo tài chính')).status).toBe(204);
    return { u, token, p, f };
  }

  it('gửi lại → chờ thẩm định, giữ mã GV + số tiền + giao dịch; không tạo khoản mới', async () => {
    const { token, p, f } = await rejected();
    const before = await row(f.id);
    expect(before.status).toBe('rejected');

    const res = await resubmit(token, f.id);
    expect(res.status).toBe(200);
    const body = fundraisingSchema.parse(await res.json());
    expect(body).toMatchObject({ id: f.id, code: f.code, amount: f.amount });
    expect(body.status).toBe('pending_review');

    const after = await row(f.id);
    expect(after.status).toBe('pending_review');
    expect(after.paymentTransactionId).toBe(before.paymentTransactionId);
    expect(after.paidAt).toEqual(before.paidAt);
    expect(await t.prisma.db.projectFundraising.count({ where: { projectId: p.id } })).toBe(1);
    // lần nữa → không còn bị từ chối
    expect((await resubmit(token, f.id)).status).toBe(409);
  });

  it('bị từ chối → mở thanh toán dự án đó 409, không mở khoản mới; lý do hiện cho chủ', async () => {
    const { token, p, f } = await rejected();
    const res = await start(token, p.id);
    expect(res.status).toBe(409);
    expect(await t.prisma.db.projectFundraising.count({ where: { projectId: p.id } })).toBe(1);
    const mine = myFundraisingsSchema.parse(
      await (await t.call('/me/fundraisings', { token })).json(),
    );
    expect(mine.items.find((x) => x.id === f.id)).toMatchObject({
      status: 'rejected',
      reviewNote: 'Thiếu báo cáo tài chính',
    });
  });

  it('người khác → 404; thiếu Idempotency-Key → 400', async () => {
    const { token, f } = await rejected();
    const other = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await resubmit(other, f.id)).status).toBe(404);
    const noKey = await t.call(`/me/fundraisings/${f.id}/resubmit`, { method: 'POST', token });
    expect(noKey.status).toBe(400);
  });

  it('gửi lại → từ chối lần hai vẫn báo chủ dự án; duyệt → đang gọi vốn', async () => {
    const { u, token, p, f } = await rejected();
    const notify = t.app.get(FundraisingNotifyHandler);
    const deliver = async () => {
      const evs = await t.prisma.db.outboxEvent.findMany({
        where: {
          type: 'fundraising.reviewed',
          payload: { path: ['fundraisingId'], equals: f.id },
        },
        select: { payload: true },
      });
      for (const e of evs)
        await notify.reviewed(parseOutboxPayload('fundraising.reviewed', e.payload));
    };
    const rejectNotes = () =>
      t.prisma.db.notification.count({
        where: { userId: u.id, title: { startsWith: 'Gói Gọi vốn bị từ chối' } },
      });

    await deliver();
    expect(await rejectNotes()).toBe(1);
    expect((await resubmit(token, f.id)).status).toBe(200);
    // khác thời điểm thẩm định (ms) → khác id thông báo
    await new Promise((r) => setTimeout(r, 5));
    expect((await review(p.id, f.id, 'reject')).status).toBe(204);
    await deliver();
    expect(await rejectNotes()).toBe(2);

    expect((await resubmit(token, f.id)).status).toBe(200);
    expect((await review(p.id, f.id, 'approve')).status).toBe(204);
    const done = await row(f.id);
    expect(done.status).toBe('active');
    expect(done.endsAt?.getTime()).toBeGreaterThan(Date.now());
  });
});
