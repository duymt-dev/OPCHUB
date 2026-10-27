import { describe, expect, it } from 'vitest';
import { actionButton, layout, otpPanel } from './email-layout';
import { adminLoginMail, otpMail, welcomeMail } from './templates';
import { emailChangedMail, emailChangeMail, passwordResetMail } from './templates-account';
import { eventRegisteredMail, eventReminderMail, type EventInfo } from './templates-event';
import { feeReminderMail, type FeeReminderKind } from './templates-fee';
import { serviceRequestMail } from './templates-service';

const welcome = {
  subject: 'Chào mừng đến với OPC Hub',
  intro: 'Kết nối cộng đồng & phát triển cùng nhau.',
  loginUrl: 'https://opchub.community/login?from=mail&lang=vi',
  guideUrl: 'https://opchub.community/guide',
  attachments: [{ title: 'Nội quy & hướng dẫn', url: 'https://opchub.community/rules.pdf' }],
  rules: ['Tôn trọng thành viên'],
  showAccess: true,
  showRules: true,
  showGuide: true,
};

const event: EventInfo = {
  title: 'Kết nối doanh nghiệp & cộng đồng',
  startsAt: new Date('2026-10-22T02:00:00Z'),
  mode: 'offline',
  address: 'Hà Nội',
  mapUrl: 'https://maps.example.com/?q=HaNoi&zoom=12',
  meetUrl: 'https://meet.example.com/room',
};

describe('REQ-005/006/082/123/204/222/322 branded HTML emails', () => {
  const cases = [
    ['OTP', otpMail('123456', 10)],
    ['Đổi email', emailChangeMail('654321', 10)],
    ['Đã đổi email', emailChangedMail('an***@example.com')],
    ['Đặt lại mật khẩu', passwordResetMail('https://opchub.community/reset-password?token=test')],
    ['Chào mừng', welcomeMail(welcome, 'Nguyễn An')],
    [
      'Quản trị',
      adminLoginMail({
        name: 'Quản trị viên',
        loginUrl: 'https://admin.opchub.community/login',
        email: 'admin@example.com',
        tempPassword: 'test-only-password',
        roleName: 'Quản trị',
      }),
    ],
    ['Sự kiện', eventRegisteredMail(event, 'An', 'https://opchub.community/events/1')],
    ['Nhắc sự kiện', eventReminderMail(event, 'An', 'https://opchub.community/events/1')],
    ['Nhắc phí', feeReminderMail('An', 'T-7', new Date('2026-10-29T00:00:00Z'), 1_200_000)],
    ['Dịch vụ', serviceRequestMail('YC-001', 'Tư vấn', 'An')],
  ] as const;

  it.each(cases)('REQ-123 %s uses one responsive brand layout with the website logo', (_, mail) => {
    expect(mail.html.match(/<!doctype html>/g)).toHaveLength(1);
    expect(mail.html.match(/<html\b/g)).toHaveLength(1);
    expect(mail.html).toContain('<html lang="vi">');
    expect(mail.html).toContain('<meta charset="utf-8">');
    expect(mail.html).toContain('name="viewport"');
    expect(mail.html).toContain('max-width:600px');
    expect(mail.html).toContain('max-width:480px');
    expect(mail.html).toContain('role="presentation"');
    for (const color of ['#1677FF', '#0B1F4D', '#F3F8FF']) expect(mail.html).toContain(color);
    expect(mail.html).not.toMatch(/<script|<link|@import/i);
    expect(mail.html.match(/<img\b/g)).toHaveLength(1);
    expect(mail.html).toContain('src="https://opchub.community/assets/logo-opchub-white.png"');
    expect(mail.html).toContain('alt="OPC HUB ASEAN – One Person Company Hub"');
    expect(mail.html).toContain('width="240" height="82"');
    expect(mail.html).not.toContain('OPC <span');
    expect(mail.subject).toBeTruthy();
    expect(mail.text).toBeTruthy();
  });

  it('REQ-227 escapes title, code and button data without escaping trusted rich text', () => {
    const html = layout('<script>"&</script>', '<p><strong>Nội dung đã làm sạch</strong></p>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;&quot;&amp;&lt;/script&gt;');
    expect(html).toContain('<p><strong>Nội dung đã làm sạch</strong></p>');
    expect(otpPanel('<img src=x>')).not.toContain('<img');
    const button = actionButton('<b>Đăng nhập</b>', 'https://example.com/?a=1&b="x"');
    expect(button).toContain('href="https://example.com/?a=1&amp;b=&quot;x&quot;"');
    expect(button).toContain('&lt;b&gt;Đăng nhập&lt;/b&gt;');
  });

  it('REQ-005 preserves OTP as contiguous selectable text and keeps it out of preheader', () => {
    const html = otpMail('123456', 10).html;
    expect(html).toContain('>123456</td>');
    expect(html).toContain('10 phút');
    expect(html).toContain('Không chia sẻ mã này');
    expect(html.match(/<div[^>]*>(.*?)<\/div>/)?.[1]).not.toContain('123456');
  });

  it('REQ-006 D-47 preserves configured links, attachments and rules without a password', () => {
    const html = welcomeMail(welcome, '<An>').html;
    expect(html).toContain('Xin chào &lt;An&gt;,');
    expect(html).toContain('href="https://opchub.community/login?from=mail&amp;lang=vi"');
    expect(html).toContain(`href="${welcome.guideUrl}"`);
    expect(html).toContain('href="https://opchub.community/rules.pdf"');
    expect(html).toContain('Tôn trọng thành viên');
    expect(html).not.toMatch(/mật khẩu/i);
    const hidden = welcomeMail({ ...welcome, showRules: false, showGuide: false }, 'An').html;
    expect(hidden).not.toContain('Tôn trọng thành viên');
    expect(hidden).not.toContain(welcome.guideUrl);
  });

  it('TD-035 reset button keeps the token and expiry for both portals', () => {
    for (const host of ['opchub.community', 'admin.opchub.community']) {
      const link = `https://${host}/reset-password?token=fake_token-123`;
      const mail = passwordResetMail(link);
      expect(mail.html).toContain(`href="${link}"`);
      expect(mail.html).toContain('15 phút');
      expect(mail.html).toContain('Nếu bạn không yêu cầu');
    }
  });

  it('REQ-082 retains Vietnam time, location, map and meeting links', () => {
    const html = eventRegisteredMail(event, '<An>', 'https://opchub.community/events/1').html;
    expect(html).toContain('09:00');
    expect(html).toContain('22/10/2026');
    expect(html).toContain('Hà Nội');
    expect(html).toContain('href="https://maps.example.com/?q=HaNoi&amp;zoom=12"');
    expect(html).toContain(`href="${event.meetUrl}"`);
    expect(html).toContain('href="https://opchub.community/events/1"');
    expect(html).toContain('Xin chào &lt;An&gt;,');
  });

  it.each<FeeReminderKind>(['T-30', 'T-7', 'T-0', 'T+3', 'pending'])(
    'REQ-204 / D-68 shows the member plan amount and non-refund notice for %s',
    (kind) => {
      const html = feeReminderMail('An', kind, new Date('2026-10-29T00:00:00Z'), 3_600_000).html;
      expect(html).toContain('3.600.000đ/năm');
      expect(html).toContain('không hoàn lại sau khi thanh toán');
    },
  );
});
