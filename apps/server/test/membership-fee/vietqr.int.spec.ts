import { crc16, vietQrPayload } from '@opchub/shared';
import { fundraisingPaymentSchema, myMembershipSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { FUNDRAISING_PLAN, planAmount } from '../factories/prices';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const FUNDING = { amount: 2_000_000_000, currency: 'VND' as const, equityPercent: 10 };

/** Chuỗi EMVCo hợp lệ: bắt đầu `000201`, kết thúc `6304` + CRC đúng */
const validCrc = (qr: string) =>
  qr.startsWith('000201') && qr.slice(-8, -4) === '6304' && qr.slice(-4) === crc16(qr.slice(0, -4));

/** TIP-V42-705 (D-96): server sinh VietQR EMVCo cho hộp chuyển khoản phí + Gói Gọi vốn */
describe('VietQR EMVCo ở server (TIP-V42-705)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestProjects(t);
    await t.close();
  });

  it('GET /me/membership: QR mã hoá đúng số tiền gói + nội dung CK, BIN/STK từ env', async () => {
    const u = await createUser(t, { fee: 'trial' });
    await assignMemberCode(t, u.id);
    const token = await tokenOf(t, u);
    const m = myMembershipSchema.parse(await (await t.call('/me/membership', { token })).json());
    expect(m.amount).toBe(planAmount('personal'));
    expect(validCrc(m.qr)).toBe(true);
    expect(m.qr).toBe(
      vietQrPayload({
        bin: '970436',
        accountNo: m.bank.accountNo,
        amount: m.amount,
        purpose: m.transferContent,
      }),
    );
  });

  it('POST /projects/:id/fundraising: QR theo số tiền khoản + nội dung `OPCHUB TV… GV…`', async () => {
    const u = await createUser(t, { fee: 'active' });
    await assignMemberCode(t, u.id);
    const token = await tokenOf(t, u);
    const p = await createProject(t, token, { funding: FUNDING });
    const f = fundraisingPaymentSchema.parse(
      await (await t.call(`/projects/${p.id}/fundraising`, { method: 'POST', token })).json(),
    );
    expect(f.amount).toBe(FUNDRAISING_PLAN.amount);
    expect(validCrc(f.qr)).toBe(true);
    expect(f.qr).toContain(`54${String(f.amount).length.toString().padStart(2, '0')}${f.amount}`);
    expect(f.qr).toContain(f.transferContent);
  });
});
