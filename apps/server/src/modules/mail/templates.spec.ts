import { describe, expect, it } from 'vitest';
import { esc, otpMail, welcomeMail } from './templates';

const tpl = {
  subject: 'Chào mừng',
  intro: 'Rất vui',
  loginUrl: 'https://opchub.community/login',
  guideUrl: 'https://opchub.community/huong-dan',
  attachments: [],
  rules: ['Tôn trọng'],
  showAccess: true,
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
    const w = welcomeMail(tpl, 'An', { email: 'an@x.vn', ownPassword: false });
    expect(w.html).toContain('Đăng nhập');
    expect(w.html).toContain('Tôn trọng');
    expect(w.html).not.toMatch(/mật khẩu/i);
    expect(w.html).not.toContain('Hướng dẫn sử dụng');
  });

  it('D-91 khối tài khoản truy cập: URL + tên đăng nhập, không có giá trị mật khẩu (D-47)', () => {
    const own = { email: 'an@x.vn', ownPassword: true };
    const w = welcomeMail(tpl, 'An', own).html;
    expect(w).toContain('URL đăng nhập');
    expect(w).toContain('an@x.vn');
    expect(w).toContain('Do bạn tự đặt khi đăng ký');
    expect(w).not.toMatch(/OPC-[A-Z0-9]{4,}/);
    // Q-B11-1: đăng ký bỏ trống mật khẩu → không có dòng "Mật khẩu"
    const none = welcomeMail(tpl, 'An', { ...own, ownPassword: false }).html;
    expect(none).toContain('URL đăng nhập');
    expect(none).not.toMatch(/mật khẩu/i);
    expect(welcomeMail({ ...tpl, showAccess: false }, 'An', own).html).not.toContain(
      'URL đăng nhập',
    );
  });
});
