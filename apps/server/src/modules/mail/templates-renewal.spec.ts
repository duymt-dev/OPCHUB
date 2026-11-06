import { describe, expect, it } from 'vitest';
import { renewalMail } from './templates-renewal';
import { vietQrPayload } from '@opchub/shared';
describe('REQ-620 renewal offline templates', () => {
  const base = {
    fullName: '<Test>',
    milestone: 'D1' as const,
    validUntil: new Date('2026-12-30T17:00:00Z'),
    amount: 1200000,
    plan: 'personal' as const,
    daysLeft: 1,
    trial: false,
  };
  it('renewal D1 qr: local EMVCo text + bank + OPCHUB content, no external URL; escaped name', () => {
    const content = 'OPCHUB TV123456 0901234567';
    const qr = vietQrPayload({
      bin: '970422',
      accountNo: '123456789',
      amount: 1200000,
      purpose: content,
    });
    const m = renewalMail({
      ...base,
      transfer: {
        qr,
        transferContent: content,
        bank: { bankName: 'MB', accountNo: '123456789', accountName: 'Media Soft' },
      },
    });
    expect(m.html).toContain(qr);
    expect(m.html).toContain(content);
    expect(m.html).toContain('1.200.000');
    expect(m.html).toContain('123456789');
    expect(m.html).toContain('Nhắc lần cuối');
    expect(m.html).toContain('&lt;Test&gt;');
    expect(m.subject).toBe('[OPC Hub] Gói Cá nhân của bạn sẽ hết hạn sau 1 ngày');
    expect(m.html).not.toContain('api.vietqr');
  });
  it('D30 benefits and trial subject/line; D7 no last reminder', () => {
    expect(renewalMail({ ...base, milestone: 'D30', daysLeft: 30 }).html).toContain(
      'kết nối cộng đồng',
    );
    expect(renewalMail({ ...base, milestone: 'D7', daysLeft: 7 }).html).not.toContain(
      'Nhắc lần cuối',
    );
    expect(renewalMail({ ...base, trial: true }).subject).toBe('Sắp hết 3 tháng miễn phí OPC Hub');
    expect(renewalMail({ ...base, trial: true }).html).toContain('kết thúc ngày 31/12/2026');
  });
});
