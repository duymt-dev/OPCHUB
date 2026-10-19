import type { WelcomeMail } from '@opchub/shared/api-domains';

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
/** Mọi giá trị chèn vào HTML đều escape (họ tên, nội dung do Admin soạn) */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

export const layout = (title: string, body: string) =>
  `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#1f1f1f">` +
  `<h2 style="color:#1677ff">${esc(title)}</h2>${body}` +
  `<p style="color:#8c8c8c;font-size:12px">OPC Hub Community</p></body></html>`;

export function otpMail(code: string, ttlMin: number): RenderedMail {
  const subject = `Mã xác thực OPC Hub: ${code}`;
  return {
    subject,
    html: layout(
      'Xác thực email',
      `<p>Mã OTP của bạn là:</p><p style="font-size:28px;letter-spacing:6px"><b>${esc(code)}</b></p>` +
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
        `</table><p>Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</p>`,
    ),
    text: `Tài khoản quản trị OPC Hub: đăng nhập tại ${m.loginUrl} bằng ${m.email} và mật khẩu tạm trong thư.`,
  };
}

/** D-47: không có mật khẩu tạm — chỉ nút "Đăng nhập" */
export function welcomeMail(tpl: WelcomeMail, fullName: string): RenderedMail {
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
      `<p>Xin chào ${esc(fullName)},</p><p>${esc(tpl.intro)}</p>${rules}${guide}` +
        (atts ? `<ul>${atts}</ul>` : '') +
        `<p><a href="${esc(tpl.loginUrl)}" style="background:#1677ff;color:#fff;padding:8px 16px;` +
        `border-radius:6px;text-decoration:none">Đăng nhập</a></p>`,
    ),
    text: `Xin chào ${fullName},\n${tpl.intro}\nĐăng nhập: ${tpl.loginUrl}`,
  };
}
