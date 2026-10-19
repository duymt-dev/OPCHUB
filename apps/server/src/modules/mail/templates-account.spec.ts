import { describe, expect, it } from 'vitest';
import { emailChangedMail, emailChangeMail, maskEmail } from './templates-account';

describe('BUG-030 mẫu thư đổi email', () => {
  it('BUG-030 OTP đổi email có mã + hạn; thông báo email cũ chỉ chứa email mới đã che', () => {
    const otp = emailChangeMail('654321', 10);
    expect(otp.html).toContain('654321');
    expect(otp.html).toContain('10 phút');
    expect(maskEmail('nguyen.an@moi.vn')).toBe('ng***@moi.vn');
    expect(maskEmail('a@x.vn')).toBe('a***@x.vn');
    const done = emailChangedMail(maskEmail('nguyen.an@moi.vn'));
    expect(done.html).toContain('ng***@moi.vn');
    expect(done.html).not.toContain('nguyen.an@moi.vn');
  });
});
