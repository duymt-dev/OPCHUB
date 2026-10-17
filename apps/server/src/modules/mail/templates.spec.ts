import { describe, expect, it } from 'vitest';
import { esc, otpMail, welcomeMail } from './templates';

const tpl = {
  subject: 'Chào mừng',
  intro: 'Rất vui',
  loginUrl: 'https://opchub.community/login',
  guideUrl: 'https://opchub.community/huong-dan',
  attachments: [],
  rules: ['Tôn trọng'],
  showRules: true,
  showGuide: false,
};

describe('mẫu mail', () => {
  it('escape HTML giá trị chèn', () => {
    expect(esc('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
    expect(welcomeMail(tpl, '<script>').html).not.toContain('<script>');
  });

  it('OTP có mã + hạn; chào mừng có nút đăng nhập, không mật khẩu (D-47)', () => {
    expect(otpMail('123456', 10).html).toContain('123456');
    const w = welcomeMail(tpl, 'An');
    expect(w.html).toContain('Đăng nhập');
    expect(w.html).toContain('Tôn trọng');
    expect(w.html).not.toMatch(/mật khẩu/i);
    expect(w.html).not.toContain('Hướng dẫn sử dụng');
  });
});
