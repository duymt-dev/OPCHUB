import type { FakeBankProvider } from '@opchub/integrations';
import { planAmount } from '../factories/prices';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BANK } from '@/common/integrations';
import { ReconcileService } from '@/modules/membership-fee';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** TIP-V4-601 — phí 3 gói theo loại TK (D-68) + chuyển thành viên cũ (D-69) */
describe('phí thành viên theo gói (REQ-501)', () => {
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

  const feeOf = (userId: string) =>
    t.prisma.db.membershipFee.findUniqueOrThrow({
      where: { userId },
      select: { status: true, plan: true, amount: true },
    });
  /** Ngân hàng giả đẩy giao dịch → quét bù → khớp đồng bộ */
  const pay = async (code: string, amount: number) => {
    // §28.1 `OPCHUB [Mã TV] [SĐT]` — SĐT ngẫu nhiên để mỗi giao dịch có nội dung riêng
    const phone = `09${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
    const content = `OPCHUB ${code} ${phone}`;
    bank.push({ id: `t-${randomUUID()}`, amount, content });
    await reconcile.poll();
    const tx = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content },
      select: { id: true },
    });
    return reconcile.match(tx.id);
  };

  it('D-68 TK Doanh nghiệp: phí 3.600.000đ; chuyển 1.200.000đ không kích hoạt', async () => {
    const u = await createUser(t, { accountType: 'business', fee: 'pending_payment' });
    const code = await assignMemberCode(t, u.id);
    expect(await feeOf(u.id)).toMatchObject({ plan: 'business', amount: 3_600_000 });
    const r = await pay(code, planAmount('personal'));
    expect(r).toMatchObject({ matched: false, reason: 'Số tiền nhỏ hơn phí thành viên' });
    expect((await feeOf(u.id)).status).toBe('pending_payment');
    expect((await pay(code, 3_600_000)).matched).toBe(true);
    expect((await feeOf(u.id)).status).toBe('active');
  });

  it('D-104 + D-116: chuyển 600.000đ (giá cũ trước v4) không tự kích hoạt; khớp tay vẫn được', async () => {
    const u = await createUser(t, { accountType: 'personal', fee: 'pending_payment' });
    const code = await assignMemberCode(t, u.id);
    expect(await pay(code, 600_000)).toMatchObject({
      matched: false,
      reason: 'Số tiền nhỏ hơn phí thành viên',
    });
    expect((await feeOf(u.id)).status).toBe('pending_payment');
    expect(await pay(code, planAmount('personal') + 1)).toMatchObject({
      matched: false,
      reason: 'Số tiền lớn hơn phí thành viên',
    });
    expect((await pay(code, planAmount('personal'))).matched).toBe(true);
    expect(await feeOf(u.id)).toMatchObject({
      status: 'active',
      plan: 'personal',
      amount: planAmount('personal'),
    });
  });

  it('D-68 Admin đổi loại TK → áp từ kỳ gia hạn sau, không đổi số đang chờ', async () => {
    const u = await createUser(t, { accountType: 'personal', fee: 'pending_payment' });
    const code = await assignMemberCode(t, u.id);
    await t.prisma.db.user.update({ where: { id: u.id }, data: { accountType: 'business' } });
    expect((await feeOf(u.id)).amount).toBe(1_200_000);
    expect((await pay(code, 1_200_000)).matched).toBe(true);
    expect(await feeOf(u.id)).toMatchObject({ plan: 'business', amount: 3_600_000 });
  });

  it('D-68 /me/membership trả số tiền theo gói; outbox confirmed mang phí thực của kỳ', async () => {
    const u = await createUser(t, { accountType: 'business', fee: 'pending_payment' });
    const code = await assignMemberCode(t, u.id);
    expect((await pay(code, 3_600_000)).matched).toBe(true);
    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'membership_fee.confirmed', payload: { path: ['userId'], equals: u.id } },
      select: { payload: true },
    });
    expect(ev.payload).toMatchObject({ listAmount: 3_600_000 });
  });
});
