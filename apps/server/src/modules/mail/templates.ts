import type { WelcomeMail } from '@opchub/shared/api-domains';
import { actionButton, esc, layout, otpPanel } from './email-layout';

export { esc, layout } from './email-layout';

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

export function otpMail(code: string, ttlMin: number): RenderedMail {
  const subject = `Mã xác thực OPC Hub: ${code}`;
  return {
    subject,
    html: layout(
      'Xác thực email',
      `<p>Mã OTP của bạn là:</p>${otpPanel(code)}` +
        `<p>Mã có hiệu lực ${ttlMin} phút. Không chia sẻ mã này cho bất kỳ ai.</p>`,
    ),
    text: `Mã OTP của bạn: ${code} (hiệu lực ${ttlMin} phút)`,
  };
}

export interface AdminLoginMailInput {
  name: string;
  loginUrl: string;
  email: string;
  tempPassword: string;
  roleName: string;
}

/**
 * QT-RB-01 (TIP-V2-201): thư đăng nhập TK quản trị — khung "URL đăng nhập / Tên đăng nhập /
 * Mật khẩu tạm" như prototype ver2. Mật khẩu tạm chỉ nằm trong thư (không log); `text` không chứa
 * mật khẩu để bản rút gọn không lộ ra ngoài thân thư.
 */
export function adminLoginMail(m: AdminLoginMailInput): RenderedMail {
  const row = (label: string, value: string) =>
    `<tr><td style="color:#8c8c8c;padding:4px 12px 4px 0">${esc(label)}</td><td>${value}</td></tr>`;
  return {
    subject: 'Tài khoản quản trị OPC Hub của bạn',
    html: layout(
      'Tài khoản quản trị OPC Hub',
      `<p>Xin chào ${esc(m.name)},</p>` +
        `<p>Bạn được cấp tài khoản quản trị với vai trò <b>${esc(m.roleName)}</b>.</p>` +
        `<table style="border:1px solid #91caff;background:#e6f4ff;border-radius:6px;padding:8px">` +
        row('URL đăng nhập', `<a href="${esc(m.loginUrl)}">${esc(m.loginUrl)}</a>`) +
        row('Tên đăng nhập', esc(m.email)) +
        row('Mật khẩu tạm', `<b style="font-family:monospace">${esc(m.tempPassword)}</b>`) +
        `</table><p>Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</p>` +
        actionButton('Đăng nhập', m.loginUrl),
    ),
    text: `Tài khoản quản trị OPC Hub: đăng nhập tại ${m.loginUrl} bằng ${m.email} và mật khẩu tạm trong thư.`,
  };
}

/**
 * D-47: không có mật khẩu tạm. D-91 (5): khối "Tài khoản truy cập" như prototype v4 — URL đăng
 * nhập, Tên đăng nhập (email người nhận), dòng mật khẩu chỉ nhắc mật khẩu người dùng tự đặt.
 */
function accessPanel(loginUrl: string, email: string): string {
  const row = (label: string, value: string) =>
    `<tr><td style="color:#8c8c8c;padding:4px 12px 4px 0">${esc(label)}</td><td>${value}</td></tr>`;
  return (
    '<table style="border:1px solid #91caff;background:#e6f4ff;border-radius:6px;padding:8px 12px">' +
    row('URL đăng nhập', `<a href="${esc(loginUrl)}">${esc(loginUrl)}</a>`) +
    row('Tên đăng nhập', esc(email)) +
    row('Mật khẩu', 'Do bạn tự đặt khi đăng ký') +
    '</table>'
  );
}

export function welcomeMail(tpl: WelcomeMail, fullName: string, email = ''): RenderedMail {
  const access = tpl.showAccess && email ? accessPanel(tpl.loginUrl, email) : '';
  const rules = tpl.showRules
    ? `<ol>${tpl.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>`
    : '';
  const guide = tpl.showGuide ? `<p><a href="${esc(tpl.guideUrl)}">Hướng dẫn sử dụng</a></p>` : '';
  const atts = tpl.attachments
    .map((a) => `<li><a href="${esc(a.url)}">${esc(a.title)}</a></li>`)
    .join('');
  return {
    subject: tpl.subject,
    html: layout(
      tpl.subject,
      `<p>Xin chào ${esc(fullName)},</p><p>${esc(tpl.intro)}</p>${access}${rules}${guide}` +
        (atts ? `<ul>${atts}</ul>` : '') +
        actionButton('Đăng nhập', tpl.loginUrl),
    ),
    text: `Xin chào ${fullName},\n${tpl.intro}\nĐăng nhập: ${tpl.loginUrl}`,
  };
}
