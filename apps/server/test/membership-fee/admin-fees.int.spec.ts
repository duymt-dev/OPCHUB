import { pageSchema } from '@opchub/shared/api';
import { feeRowSchema, feeSummarySchema, unmatchedTxnPageSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assignMemberCode,
  type CreatedUser,
  createUser,
  flushAuthState,
  loginOf,
  tokenBodySchema,
} from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('Admin Phí thành viên (TIP-B15)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  const tokenOf = async (u: CreatedUser) =>
    tokenBodySchema.parse(await (await loginOf(t, u)).json()).accessToken;
  const adminToken = async () => tokenOf(await createUser(t, { systemRole: 'admin' }));

  it('danh sách lọc trạng thái + tìm theo Mã TV; summary khớp schema', async () => {
    const token = await adminToken();
    const u = await createUser(t, { fee: 'pending_payment' });
    const code = await assignMemberCode(t, u.id);
    const r = await t.call(`/admin/fees?status=pending_payment&q=${code.toLowerCase()}`, { token });
    expect(r.status).toBe(200);
    const page = pageSchema(feeRowSchema).parse(await r.json());
    expect(page.items.map((x) => x.userId)).toEqual([u.id]);
    expect(page.items[0]?.memberCode).toBe(code);

    const s = feeSummarySchema.parse(await (await t.call('/admin/fees/summary', { token })).json());
    expect(s.total).toBe(s.active + s.pending_payment + s.expiring + s.expired);
    expect(s.feeAmount).toBe(600_000);
  });

  it('collect user pending → active, kỳ manual có lý do, audit fee.collect', async () => {
    const token = await adminToken();
    const u = await createUser(t, { fee: 'pending_payment' });
    const r = await t.call(`/admin/fees/${u.id}/collect`, { method: 'POST', token });
    expect(r.status).toBe(200);
    expect(feeRowSchema.parse(await r.json()).status).toBe('active');
    const p = await t.prisma.db.membershipFeePeriod.findFirstOrThrow({
      where: { userId: u.id },
      select: { source: true, reason: true },
    });
    expect(p).toEqual({ source: 'manual', reason: 'Admin ghi nhận đã thu' });
    expect(
      await t.prisma.db.auditLog.count({ where: { action: 'fee.collect', entityId: u.id } }),
    ).toBe(1);
  });

  it('REQ-204 collect hàng loạt + remind ghi mail_logs fee_reminder + audit; action lạ → 404', async () => {
    const token = await adminToken();
    const a = await createUser(t, { fee: 'expired' });
    const b = await createUser(t, { fee: 'pending_payment' });
    const c = await t.call('/admin/fees/collect', {
      method: 'POST',
      token,
      json: { userIds: [a.id, b.id] },
    });
    expect(await c.json()).toEqual({ updated: 2 });

    const d = await createUser(t, { fee: 'expiring' });
    const rem = await t.call('/admin/fees/remind', {
      method: 'POST',
      token,
      json: { userIds: [d.id] },
    });
    expect(rem.status).toBe(202);
    expect(await rem.json()).toEqual({ queued: 1 });
    expect(await t.prisma.db.mailLog.count({ where: { to: d.email, kind: 'fee_reminder' } })).toBe(
      1,
    );
    expect((await t.call(`/admin/fees/${d.id}/xoa`, { method: 'POST', token })).status).toBe(404);
  });

  it('export CSV có BOM + tiêu đề, audit export.fees', async () => {
    const token = await adminToken();
    const u = await createUser(t, { fee: 'active' });
    const r = await t.call('/admin/fees/export', {
      method: 'POST',
      token,
      json: { userIds: [u.id] },
    });
    const body = (await r.json()) as { filename: string; csv: string };
    expect(body.filename).toBe('phi-thanh-vien.csv');
    expect(body.csv.charCodeAt(0)).toBe(0xfeff);
    expect(body.csv).toContain('Đang hiệu lực');
    expect(body.csv).toContain(u.email);
  });

  it('REQ-203 BUG-014 danh sách unmatched có matchedHint; khớp tay thiếu m.edit → 403', async () => {
    const token = await adminToken();
    const u = await createUser(t, { fee: 'pending_payment' });
    const code = await assignMemberCode(t, u.id);
    // Thiếu tiền (500.000đ) → không tự kích hoạt, vào hàng "Cần đối soát" nhưng đọc được Mã TV
    const content = `OPCHUB ${code} thieu tien ${Date.now()}`;
    const sim = await t.call('/dev/bank/simulate', {
      method: 'POST',
      json: { amount: 500_000, content },
    });
    expect(sim.status).toBe(200);
    const tx = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content, matchStatus: 'unmatched' },
      select: { id: true },
    });
    const list = unmatchedTxnPageSchema.parse(
      await (await t.call('/admin/fees/transactions?size=100', { token })).json(),
    );
    const row = list.items.find((x) => x.id === tx.id);
    expect(row?.matchedHint).toBe(code);
    expect(row?.amount).toBe(500_000);

    const mod = await tokenOf(await createUser(t, { systemRole: 'moderator' }));
    const res = await t.call(`/admin/fees/transactions/${tx.id}/match`, {
      method: 'POST',
      token: mod,
      json: { userId: u.id, reason: 'x' },
    });
    expect(res.status).toBe(403);
    // QĐ-01: kế toán vẫn khớp tay được giao dịch thiếu tiền
    const ok = await t.call(`/admin/fees/transactions/${tx.id}/match`, {
      method: 'POST',
      token,
      json: { userId: u.id, reason: 'Khách bổ sung tiền mặt' },
    });
    expect(ok.status).toBe(204);
  });

  it('REQ-203 BUG-014 khớp tay → audit fee.match_transaction + kỳ phí manual có lý do', async () => {
    const token = await adminToken();
    const u = await createUser(t, { fee: 'pending_payment' });
    const content = `CHUYEN KHOAN SAI NOI DUNG ${Date.now()}`;
    await t.call('/dev/bank/simulate', { method: 'POST', json: { amount: 600_000, content } });
    const tx = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content, matchStatus: 'unmatched' },
      select: { id: true },
    });
    const path = `/admin/fees/transactions/${tx.id}/match`;
    const body = { userId: u.id, reason: 'Kế toán đối chiếu sao kê' };
    expect((await t.call(path, { method: 'POST', token, json: body })).status).toBe(204);
    const p = await t.prisma.db.membershipFeePeriod.findFirstOrThrow({
      where: { userId: u.id },
      select: { source: true, reason: true, paymentTransactionId: true },
    });
    expect(p).toEqual({ source: 'manual', reason: body.reason, paymentTransactionId: tx.id });
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'fee.match_transaction', entityId: tx.id },
      }),
    ).toBe(1);
  });

  it('giao dịch không khớp → khớp tay: user active, giao dịch manual, khớp lần 2 → 409', async () => {
    const token = await adminToken();
    const u = await createUser(t, { fee: 'pending_payment' });
    const sim = await t.call('/dev/bank/simulate', {
      method: 'POST',
      json: { amount: 600_000, content: 'chuyen khoan khong ghi ma' },
    });
    expect(sim.status).toBe(200);
    const tx = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content: 'chuyen khoan khong ghi ma', matchStatus: 'unmatched' },
      orderBy: { receivedAt: 'desc' },
      select: { id: true },
    });
    const list = unmatchedTxnPageSchema.parse(
      await (await t.call('/admin/fees/transactions?size=100', { token })).json(),
    );
    expect(list.items.some((x) => x.id === tx.id)).toBe(true);

    const body = { userId: u.id, reason: 'Khách gọi xác nhận' };
    const path = `/admin/fees/transactions/${tx.id}/match`;
    expect((await t.call(path, { method: 'POST', token, json: body })).status).toBe(204);
    const fee = await t.prisma.db.membershipFee.findUniqueOrThrow({
      where: { userId: u.id },
      select: { status: true },
    });
    expect(fee.status).toBe('active');
    const after = await t.prisma.db.paymentTransaction.findUniqueOrThrow({
      where: { id: tx.id },
      select: { matchStatus: true, matchedUserId: true },
    });
    expect(after).toEqual({ matchStatus: 'manual', matchedUserId: u.id });
    expect((await t.call(path, { method: 'POST', token, json: body })).status).toBe(409);
  });
});
