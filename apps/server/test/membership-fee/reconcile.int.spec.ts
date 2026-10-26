import type { FakeBankProvider } from '@opchub/integrations';
import { planAmount } from '@opchub/shared';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BANK } from '@/common/integrations';
import { FeeSchedulerService, ReconcileService } from '@/modules/membership-fee';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const DAY = 86_400_000;
/** D-68: factory tạo TK Cá nhân → phí 1.200.000đ */
const FEE = planAmount('personal');

describe('đối soát + scheduler phí (TIP-B14)', () => {
  let t: TestApp;
  let bank: FakeBankProvider;
  let reconcile: ReconcileService;

  beforeAll(async () => {
    t = await createTestApp();
    bank = t.app.get<FakeBankProvider>(BANK);
    reconcile = t.app.get(ReconcileService);
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  /** Gửi webhook đã ký như ngân hàng thật */
  const webhook = (body: { id?: string; amount: number; content: string }, tamper = false) => {
    const signed = bank.sign({ id: body.id ?? `t-${randomUUID()}`, ...body });
    return t.call('/webhooks/bank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...signed.headers,
        ...(tamper ? { 'x-fake-signature': '0'.repeat(64) } : {}),
      },
      body: signed.rawBody,
    });
  };
  /** Chạy job khớp đồng bộ (worker thật không chạy trong process api test) */
  const matchAll = async () => {
    const rows = await t.prisma.db.paymentTransaction.findMany({
      where: { matchStatus: 'unmatched' },
      select: { id: true },
    });
    return Promise.all(rows.map((r) => reconcile.match(r.id)));
  };
  const feeOf = (userId: string) =>
    t.prisma.db.membershipFee.findUniqueOrThrow({
      where: { userId },
      select: { status: true, validUntil: true },
    });
  const periods = (userId: string) => t.prisma.db.membershipFeePeriod.count({ where: { userId } });

  async function payer(fee: 'pending_payment' | 'active' | 'expired' = 'pending_payment') {
    const u = await createUser(t, { fee });
    const code = await assignMemberCode(t, u.id);
    return { ...u, code };
  }

  it('REQ-203 chữ ký sai → 401, không lưu giao dịch', async () => {
    const id = `t-${randomUUID()}`;
    expect((await webhook({ id, amount: FEE, content: 'x' }, true)).status).toBe(401);
    expect(await t.prisma.db.paymentTransaction.count({ where: { bankTxnId: id } })).toBe(0);
  });

  it('REQ-203 REQ-383 nội dung bẩn "opchub tv000123 0912…" + đủ tiền → active, hạn +12 tháng kể từ ngày xác nhận, outbox activated', async () => {
    const u = await payer();
    const before = Date.now();
    const res = await webhook({
      amount: FEE,
      content: `ck opchub${u.code.toLowerCase()} 0912345678`,
    });
    expect(res.status).toBe(200);
    await matchAll();
    const f = await feeOf(u.id);
    expect(f.status).toBe('active');
    const months = ((f.validUntil?.getTime() ?? 0) - before) / DAY;
    expect(months).toBeGreaterThan(364);
    expect(months).toBeLessThan(367);
    const ev = await t.prisma.db.outboxEvent.count({
      where: { type: 'membership_fee.activated', payload: { path: ['userId'], equals: u.id } },
    });
    expect(ev).toBe(1);
  });

  it('REQ-203 NR-R03 gia hạn sớm: đang active còn 100 ngày → nối tiếp từ ngày hết hạn (BR-05)', async () => {
    const u = await payer('active');
    const until = new Date(Date.now() + 100 * DAY);
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { validUntil: until },
    });
    await webhook({ amount: FEE, content: `OPCHUB ${u.code}` });
    await matchAll();
    const f = await feeOf(u.id);
    const expected = new Date(until);
    expected.setUTCFullYear(expected.getUTCFullYear() + 1);
    expect(Math.abs((f.validUntil?.getTime() ?? 0) - expected.getTime())).toBeLessThan(2 * DAY);
  });

  it('REQ-203 thiếu tiền → unmatched kèm lý do, phí không đổi', async () => {
    const u = await payer();
    await webhook({ amount: 500_000, content: `OPCHUB ${u.code}` });
    const [r] = await matchAll();
    expect(r?.matched).toBe(false);
    expect((await feeOf(u.id)).status).toBe('pending_payment');
    const tx = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content: `OPCHUB ${u.code}` },
      select: { matchStatus: true, raw: true },
    });
    expect(tx.matchStatus).toBe('unmatched');
    expect(JSON.stringify(tx.raw)).toContain('Số tiền nhỏ hơn phí');
  });

  it('REQ-203 sai nội dung: không có Mã TV / mã không tồn tại → unmatched', async () => {
    await webhook({ amount: FEE, content: 'chuyen tien phi thanh vien' });
    await webhook({ amount: FEE, content: 'OPCHUB TV999998' });
    const results = await matchAll();
    expect(results.every((r) => !r.matched)).toBe(true);
  });

  it('REQ-203 idempotent: webhook gửi lại + quét bù cùng bank_txn_id → 1 giao dịch, 1 kỳ phí', async () => {
    const u = await payer();
    const id = `t-${randomUUID()}`;
    const content = `OPCHUB ${u.code}`;
    await webhook({ id, amount: FEE, content });
    await webhook({ id, amount: FEE, content });
    bank.push({ id, amount: FEE, content });
    await reconcile.poll();
    await matchAll();
    await matchAll();
    expect(await t.prisma.db.paymentTransaction.count({ where: { bankTxnId: id } })).toBe(1);
    expect(await periods(u.id)).toBe(1);
  });

  it('REQ-203 hai lần khớp song song cùng giao dịch → chỉ một kỳ', async () => {
    const u = await payer();
    await webhook({ amount: FEE, content: `OPCHUB ${u.code}` });
    const tx = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content: `OPCHUB ${u.code}` },
      select: { id: true },
    });
    const rs = await Promise.allSettled([reconcile.match(tx.id), reconcile.match(tx.id)]);
    expect(rs.filter((r) => r.status === 'fulfilled' && r.value.matched)).toHaveLength(1);
    expect(await periods(u.id)).toBe(1);
  });

  it('REQ-204 scheduler: còn 20 ngày → expiring; quá hạn → expired; chạy 2 lần không đổi thêm', async () => {
    const a = await payer('active');
    const b = await payer('active');
    await t.prisma.db.membershipFee.update({
      where: { userId: a.id },
      data: { validUntil: new Date(Date.now() + 20 * DAY) },
    });
    await t.prisma.db.membershipFee.update({
      where: { userId: b.id },
      data: { validUntil: new Date(Date.now() - DAY) },
    });
    const sched = t.app.get(FeeSchedulerService);
    expect(await sched.sweep()).toBeGreaterThanOrEqual(2);
    expect((await feeOf(a.id)).status).toBe('expiring');
    expect((await feeOf(b.id)).status).toBe('expired');
    const changedA = await t.prisma.db.outboxEvent.count({
      where: { type: 'membership_fee.changed', payload: { path: ['userId'], equals: a.id } },
    });
    await sched.sweep();
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'membership_fee.changed', payload: { path: ['userId'], equals: a.id } },
      }),
    ).toBe(changedA);
  });

  it('dev/bank/simulate đi đúng đường webhook (chỉ non-production)', async () => {
    const u = await payer();
    const r = await t.call('/dev/bank/simulate', {
      method: 'POST',
      json: { amount: FEE, content: `OPCHUB ${u.code}` },
    });
    expect(r.status).toBe(200);
    await matchAll();
    expect((await feeOf(u.id)).status).toBe('active');
  });
});
